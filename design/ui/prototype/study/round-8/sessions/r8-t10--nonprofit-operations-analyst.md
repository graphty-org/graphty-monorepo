# Session: label every character (Les Miserables sample) -- nonprofit operations analyst

Participant: Grace, the nonprofit operations analyst (study/personas/nonprofit-operations-analyst.md).
First time using the program.

Task as given: "You have never used this program before. You will practice on the ready-made
network of characters from the novel Les Miserables that comes with the program, not on your own
data. Right now only a few characters have their names written on the drawing. Get every
character's name written next to its dot."

Renders: tmp/round-8-sessions/r8-t10--nonprofit-operations-analyst/NN.png
(all commands run from design/ui/prototype; every run replays from the start screen).
Base command: `timeout 120 node app-b/study.mjs --try <render> task:r8-t10 <steps>`

## Steps

### 01 -- start screen (shots/tasks/r8-t10/01.png)
"Start, recent projects, samples. A box at the bottom asks about usage data. Good that it says files
are read on this computer and never uploaded -- that matters for donor names. Les Miserables is
right there under Samples, 77 characters. I'll dismiss the box and open it."

### 02 -- open the sample
`--click "No thanks" --click "Les Miserables"`
"Whoa. Orange dots, a long list on the left with words I don't know -- PageRank, Louvain, Density,
Link prediction. About fifteen names on the drawing: Fantine, Myriel, Valjean, Javert, Cosette...
The task says 'only a few'. On the left there's a row 'Labels show... 1 node'. Labels is the word I
want. It says 1 node, but I can see more than one name, which is odd."

### 03 -- try the "Labels show..." row
`... --click "Labels show"`
"A black message: 'Labels shown anyway (this file): Valjean. Opens in the inspector (not available
yet).' So that row is just Valjean, and it does nothing. Dead end, and I still don't know why the
other dozen names are showing."

### 04 -- "Everything" row
`... --click "Everything"`
"'Everything' at the bottom sounds like all the dots. The right side says 'Paints 77 nodes, 254
edges' -- 77, that matches the sample count, good. There's Fill, Shape, and then Effects, Label,
Tooltip with plus signs. Label is what I want."

### 05 -- click the word Label
`... --click "Label"`
"Nothing happened when I clicked the word."

### 06 -- hover the plus by Label, guessing a name
`... --hover "Add label"`
Result: nothing on screen is called "Add label".
"I'm guessing at what the little plus is called."

### 07 -- click a plus
`... --click "Add"`
Result: three pluses (Effects, Label, Tooltip); it took the first one (Effects).
"Wrong plus. The one by Label must be 'Add to Label'."

### 08 -- the plus by Label
`... --click "Add to Label"`
"A little menu: 'Label line' and 'Show labels'. Show labels -- that's it."

### 09 -- Show labels
`... --click "Show labels"`
"It added a line 'Show labels' with an EMPTY checkbox. So choosing 'Show labels' doesn't show
labels; I have to tick it as well. Two steps for one thing."

### 10 -- tick the box
`... --click "Show labels" --click "Show labels"` (the box)
"Ticked. And... the drawing is exactly the same. Same dozen names. Did it work? Is it still
thinking? Up top this panel said 'Covered by PageRank for Color' -- maybe something higher up the
list is covering the labels the same way? Nothing says so."

### 11 -- hover "Labels" again
`--click "No thanks" --click "Les Miserables" --hover "Labels"`
Tooltip: "Labels shown anyway (this file) Double-click to rename".
"Same confusing row. 'Shown anyway' -- anyway compared to what?"

### 12 -- look for a general Show labels switch
`--click "No thanks" --click "Les Miserables" --click "Show labels"`
Result: nothing on screen is called "Show labels".
"No overall switch for names on the drawing."

### 13 -- the main menu
`--click "No thanks" --click "Les Miserables" --click "Menu"`
"File-type things: New, Open, Save, Export, Settings, Help. Nothing about names or labels. The
right panel switched to a summary: 77 nodes. Fine, but not what I need."

### 14, 15 -- the cylinder icon next to my ticked box
`... --click "Add to Label" --click "Show labels" --click "Show labels" --hover "data"` and
`... --hover "column"`
Results: "data" hit the Data button on the left (no tooltip); "column" found no tooltip.
"Maybe that icon picks what text gets written. I can't find out what it's called. Drawing still
the same."

### Stop
"I ticked 'Show labels' on the row that says it paints all 77, and the picture didn't change. Either
it's on and the screen just doesn't show it, or something above it wins, like PageRank wins the
color. I don't know which, and nothing on screen tells me. I'd stop here and ask someone."

## Debrief

- **Succeeded?** "I don't think so. I found a 'Show labels' box and ticked it, but I can't see
  more names, so as far as I can tell it didn't work."
- **Single Ease Question (1-7):** 2.
- **Would she use this instead of her current tool (Excel and slides)?** "Not for this. Names on
  the dots are the whole point of a slide for the board. In PowerPoint I'd just type them. Here I
  found the switch and still couldn't tell whether it worked. I liked the line that says my files
  aren't uploaded, and the 77 matched what I expected -- but I can't use something where ticking
  a box gives no sign it did anything."

## Observations (participant's words, not a designer's)

1. Ticking "Show labels" on "Everything" made no visible change on the drawing; no message about
   why (hidden by something above? too crowded? needs zooming?).
2. Picking "Show labels" from the plus menu only added an unticked box; a second click was needed.
3. The plus buttons have no visible words; finding the right one took guessing.
4. "Labels shown anyway (this file) -- 1 node" did not match the dozen names on screen, and
   clicking it said "not available yet".
5. No obvious single "names on/off" control anywhere outside that panel.
6. Clicking the word "Label" (the heading) did nothing.
