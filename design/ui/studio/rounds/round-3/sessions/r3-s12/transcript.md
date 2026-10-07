# Session r3-s12 -- Tom (the recipe recipient), task T10 A (Les Miserables)

Task as given: "You have never used this program before. You will practice on the ready-made
network of characters from the novel Les Miserables that comes with the program, not on your own
data. Right now no names are written on the drawing. Get every character's name written next to
its dot."

Start: empty app.

## Step 1 -- start

Command: `node tool/real.mjs --start rounds/round-3/sessions/r3-s12 empty` -> 01.png

Saw: a dark start page. "Open project or file...", "New from data...", "Samples" on the right with
Les Miserables at the top (77 characters). A box at the bottom about usage data, "Share usage data"
/ "No thanks". Top right says "Local only" with a lock.

Tom: "OK, no install, it's a web page. Something wants to collect usage data -- no thanks. Then the
Les Miserables one, it's right there."

## Step 2 -- decline usage data

Command: `--step --click "No thanks"` -> 02.png

Tom: "Box gone. Now the Les Miserables sample."

## Step 3 -- open the sample

Command: `--step --click "Les Miserables"` -> 03.png

Saw: a blue dot-and-line drawing in the middle, no names anywhere, as promised. Left panel: a
search box, "Selection", "Everything". Right panel: "Graph / From Les Miserables", two tabs "Style"
and "Values" (Values is on), and numbers: Nodes 77, Edges 254, Density, Components. A small
toolbar at the bottom with four icons and "3D", no words on them.

Tom: "77 -- matches the 77 characters it said. Fine. No names on the dots. Names on dots sounds
like how it looks, so 'Style' on the right is my best guess. I'm not touching the unlabeled
icons at the bottom yet."

## Step 4 -- the Style tab (first dead end)

Command: `--step --click "Style"` -> 04.png

Saw: Style tab is on, but it shows "Canvas / Background F5F5F5", then "Method: Force -
Recommended" with grey small text about pulling nodes together, "Shape 3D / 2D", "Spring length
30", "Gravity -1.2", "Advanced", "Applied". Nothing about names or labels.

Tom (hesitates): "Spring length, gravity... that's the postdoc's job, not mine. Nothing here says
names. Maybe I clicked the wrong thing. The left side says 'Everything' -- that sounds like all the
dots. Try that."

## Step 5 -- "Everything"

Command: `--step --click "Everything"` -> 05.png

Saw: "Everything" is highlighted on the left. The right panel now says "Everything", Style tab,
"Nodes / Edges", then Fill with a Color 6366F1, Shape (size 1, Icosphere), Effects, and then
"Label" with a plus sign, and "Tooltip" with a plus sign. The drawing did not change.

Tom: "There -- 'Label'. That's names, I'd think. There's a little plus next to it. Click the plus."

## Step 6 -- plus next to "Label"

Command: `--step --click-at 1419,362` (tool: button "Add label line") -> 06.png

Saw: a small box popped out titled "Label", with "Find an attribute", and a list "Attributes":
"id" and "name". In the panel a row appeared reading "Pick an attribute" with a minus.

Tom: "'Attribute' -- not my word, but 'name' is plain enough. I want their names. Pick 'name'."

## Step 7 -- pick "name"

Command: `--step --click "name"` -> 07.png

Saw: names appeared above the dots straight away: Blacheville, Fameuil, Favourite, Myriel,
Napoleon, Old Man, Mlle Baptistine and so on. Very small and thin type, hard on my eyes, and in
the crowded middle they run into each other. The panel row now reads "Aa Above / Abc name" and
underneath, small grey: "77 labels, 7 hidden", with a checkbox "Show all labels".

Tom: "That's names, good. But it says 7 hidden -- I was asked for every character, and I count
things. 77 is all of them, 7 not showing. There's a box 'Show all labels'. Tick it."

## Step 8 -- "Show all labels"

Command: `--step --click "Show all labels"` -> 08.png

Saw: the box is ticked and the count now reads just "77 labels", no "hidden". A few more names
showed up in the crowded middle (Gillenormand, Marguerite, Mother Innocent, Mlle Gillenormand,
Mme Pontmercy). In the middle the names are tiny and pile on top of each other; I could not read
most of them there without my glasses, and some overlap so badly I could not tell which name
belongs to which dot. Around the edges they read fine.

Tom: "77 labels, 77 characters, nothing hidden. That's every one. I'm done."

## End

Command: `node tool/real.mjs --end rounds/round-3/sessions/r3-s12`

## Tom, afterwards

- **Finished?** Yes. Every character has a name on the drawing, and the panel says 77 labels with
  none hidden, which matches the 77 characters on the start page.
- **How easy, 1 (very difficult) to 7 (very easy):** 5.
- **What got in the way:**
  - My first guess was the "Style" tab on the right while nothing was picked. It showed background
    colour, "Method", "Spring length" and "Gravity" -- nothing about names. I only found "Label"
    after clicking "Everything" on the left, and I clicked that on a hunch because the word
    sounded like "all the dots". If that hunch had not worked I would have been at my second
    failure.
  - Two "Style" tabs that show different things depending on what is picked on the left. I did
    not know the left side was choosing what the right side talks about.
  - After I picked "name", it quietly left 7 names off ("77 labels, 7 hidden"). I only caught it
    because I read counts. The note is small grey text; someone less fussy would have thought
    they were done.
  - "Attribute" and "Pick an attribute" -- not my words; luckily "name" was in the list.
  - The names are very small, thin type. In the busy middle they sit on top of each other and I
    could not read them. "Every name written" is true, but I could not hand this to the PI as a
    figure where people read the names in the middle.
- **What went well:** it opened in the browser with no install or sign-in, the sample was right
  there with its count, and the names appeared the moment I picked "name" -- no Apply button, I
  could see it worked.
