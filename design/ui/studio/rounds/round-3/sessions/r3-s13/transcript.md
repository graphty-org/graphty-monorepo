# Session r3-s13 -- participant "Dev" (class-project student), task T10 A (Les Miserables)

Task as given: "You have never used this program before. You will practice on the ready-made
network of characters from the novel Les Miserables that comes with the program, not on your own
data. Right now no names are written on the drawing. Get every character's name written next to
its dot."

Start: empty.

## Step 1 -- start

Command: `node tool/real.mjs --start $S empty` -> 01.png

Saw: a start page. "Start" (Open project or file..., New from data...), "Recent projects" (empty),
"Samples" with Les Miserables (77 characters), Zachary's karate club, College football, Florentine
families. A box at the bottom asks about usage data: "Share usage data" / "No thanks".

Thinking (Dev): "OK, there's the Les Miserables sample right there, good. First I'll get rid of the
data box -- I'll say no thanks -- then open Les Miserables."

## Step 2 -- decline usage data

Command: `--step --click "No thanks"`
-> 02.png

Saw: the data box is gone; the rest of the start page is the same.

Thinking (Dev): "Now the sample. I'll click Les Miserables."

## Step 3 -- open the sample

Command: `--step --click "Les Miserables"`
-> 03.png

Saw: the network is drawn -- blue dots and gray lines, no names anywhere. Left: "Graph Les
Miserables", a find box, "Selection", "Everything". Right: a "Graph" panel with "Style" and
"Values" tabs; Values is open and shows Nodes 77, Edges 254, Density, Components. Bottom toolbar:
a flask icon, a chart icon, "3D", a magnifier.

Thinking (Dev): "In the tutorial labels were their own thing. I don't see the word 'labels'
anywhere. Labels are about how it looks, so I'll try the 'Style' tab on the right."

## Step 4 -- open the Style tab

Command: `--step --click "Style"`
-> 04.png

Saw: Style for "Graph" shows only Canvas background, a layout "Method" (Force - Recommended),
Shape 3D/2D, Spring length, Gravity, Advanced. Nothing about names or labels. (Hesitation: this
looks like the "layout" step, not labels.)

Thinking (Dev): "That's the whole drawing's settings, not the dots. Maybe I need to pick the dots
first. On the left there's 'Everything' -- I'll click that and see if the dots get their own
style."

## Step 5 -- click "Everything" in the left list

Command: `--step --click "Everything"`
-> 05.png

Saw: the right panel now says "Everything", Style tab, Nodes / Edges switch (Nodes on). Fill
color 6366F1, Shape size 1, Icosphere, then "Effects +", "Label +", "Tooltip +".

Thinking (Dev): "There it is -- 'Label'. It has a plus next to it, so I guess labels are off and
I add them with the plus. Clicking the plus beside Label."

## Step 6 -- click the plus beside "Label"

Command: `--step --click-at 1419,362`
-> 06.png (tool: the plus is "Add label line")

Saw: a popup titled "Label" with "Find an attribute" and a list "Attributes": id, name. Under
Label in the panel a row "Pick an attribute" with a minus.

Thinking (Dev): "It wants to know what to write. I want the character's name, so 'name'."

## Step 7 -- pick "name"

Command: `--step --click "name"`
-> 07.png

Saw: names appeared on the drawing above most dots (Blacheville, Fameuil, Myriel, Napoleon,
Cravatte...). In the panel the Label row now reads "Aa Above | Abc name" with a minus, and below
it small gray text "77 labels, 7 hidden" and an unticked box "Show all labels". In the crowded
middle some names overlap and are tiny.

Thinking (Dev): "Names! But it says 7 are hidden, and the task says every character. There's a
'Show all labels' box -- that sounds exactly like it. Ticking it."

## Step 8 -- tick "Show all labels"

Command: `--step --click "Show all labels"`
-> 08.png

Saw: the box is ticked and the gray text now says just "77 labels" -- no "hidden" any more. A few
more names showed up (Gillenormand, Marguerite, Mother Innocent, Mme Pontmercy, Mlle
Gillenormand). Every dot I can see has a name over it. In the dense middle the names are very
small and pile on top of each other.

Thinking (Dev): "77 labels and 77 characters, nothing hidden, so that should be all of them. The
middle is a mess though -- let me zoom in there to check I can actually read them."

## Step 9 -- zoom into the crowded middle

Command: `--step --wheel 700,420,-400`
-> 09.png

Saw: the drawing zoomed in only a little. The names grew a bit and the outer ones are easy to read
(Myriel, Napoleon, Old Man, Fauchelevent, Mother Innocent). In the middle around the busiest dot
the names are still tiny and stacked on each other, but there is a name on every dot I can find.

Thinking (Dev): "Good enough -- every dot has its name, and the panel says 77 labels with none
hidden. If I needed the middle readable for my essay I'd zoom more, but the task was names on
every dot. I'm done."

## End

Command: `node tool/real.mjs --end $S`

## Debrief (in character)

- **Did I finish?** Yes. Names are written next to every dot, and the panel says "77 labels" with
  nothing hidden after I ticked "Show all labels".
- **Ease: 6 out of 7.** Five clicks after opening the sample.
- **Where I hesitated / what confused me:**
  - Nothing on the first screen of the drawing says "labels". I tried the right panel's "Style"
    tab first, and it showed background and layout settings for the whole graph, which wasn't it.
    I only found "Label" after clicking "Everything" on the left. I didn't know what "Everything"
    meant -- I clicked it as a guess. If that second guess had failed I'd have been stuck.
  - The "Label" heading had just a plus beside it. It worked, but I wasn't sure the plus meant
    "turn names on" rather than "add something extra".
  - After I picked "name", it said "77 labels, 7 hidden" -- I'm glad it told me, because I would
    have thought I was finished. Why would some be hidden by default? "Show all labels" fixed it.
  - In the crowded middle the names are tiny and pile on each other; for a class figure I'd want
    them readable, and zooming only helped a little.
  - "Aa Above" next to the label -- I guess it means the name sits above the dot, but I didn't
    touch it.
