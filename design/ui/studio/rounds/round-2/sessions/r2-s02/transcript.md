# Session r2-s02 -- Grace (nonprofit operations analyst), task T15 Prompt A (Les Miserables)

Tool: `T=/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tool`, `S=<this folder>`.

## Step 1 -- start

Command: `node $T/real.mjs --start $S empty` -> 01.png

Seen: a dark start page. "Start" with Open project or file / New from data, a line saying files are
read on this computer and never uploaded (good, I noticed that). Samples on the right: Les Miserables,
77 characters, "Good for a first look at communities and who holds the story together." A usage-data
banner at the bottom.
Next: say No thanks to the usage data (I do not send anything off the laptop), then open Les Miserables.

## Step 2 -- decline usage data, open the sample

Command: `node $T/real.mjs --step $S --click "No thanks" --click "Les Miserables"` -> 02.png

Seen: the drawing is up, blue dots and gray lines, no names on the dots. Right panel says Nodes 77,
Edges 254 -- 77 matches the "77 characters" on the start page, so everyone arrived. Some numbers I
would not put on a slide (Density 0.08681, "Edges per ..."), but fine. Bottom left: "Analyze (flask)
in the toolbar (Shift+A) to add results here". Toolbar at the bottom has a flask icon.
**Part 1 done: it is on screen, 77 characters.**
Next: click the flask (Analyze) to have it work out who matters most.

## Step 3 -- open Analyze

Command: `node $T/real.mjs --step $S --click "Analyze"` -> 03.png

Seen: a list "Rank nodes and edges": Degree ("How many edges each node has"), Betweenness, Closeness,
PageRank with a "Start here" tag ("Which nodes are connected to other well-connected nodes"),
Eigenvector, Katz, HITS... Lots of jargon names but each has a one-line plain description, which
helps. Hesitated between Degree (plainest: how many connections) and PageRank. "Start here" tells
me the program thinks PageRank is the one to begin with, and "connected to other well-connected"
sounds like "matters most".
Next: click PageRank.

## Step 4 -- PageRank

Command: `node $T/real.mjs --step $S --click "PageRank"` -> 04.png

Seen: a small form: "Damping factor 0.85" (no idea, leave it), Weight None, Advanced, "Under a
second", a blue Run button. I will not touch settings I do not understand.
Next: click Run.

## Step 5 -- Run

Command: `node $T/real.mjs --step $S --click "Run"` -> 05.png

Seen: all the dots turned orange; a few (the busy hubs) look darker brown. A key in the top left:
"Color: Influence 0.003299 to 0.07543". The left list now has "Influence 77". So PageRank is called
"Influence" here -- that I can put on a slide. The numbers 0.003299 to 0.07543 mean nothing to a
board, and the colors are so close I can barely tell them apart, but it worked.
**Part 2 done: it worked out who matters most ("Influence").**
Next: make the dots bigger for the more influential ones. I will click "Influence" in the left list
to see what I can do with it.

## Step 6 -- click Influence in the list

Command: `node $T/real.mjs --step $S --click "Influence"` -> 06.png

Seen: the right panel switched to "Influence" with a Style tab: Fill (Color: Influence), then Shape,
Effects, Label, Tooltip, each with a plus. No "Size" anywhere I can see. Size is probably part of
"Shape"?
Next: click the plus next to Shape.

## Step 7 -- plus next to Shape

Command: `node $T/real.mjs --step $S --click-at 1419,234` (button "Add to Shape") -> 07.png

Seen: a little menu: Size, Shape. There it is.
Next: click Size.

## Step 8 -- Size

Command: `node $T/real.mjs --step $S --click "Size"` -> 08.png

Seen: a Size row with a box saying "1" and a little chain-link icon next to it. A fixed number 1
would make every dot the same size; I want it to follow Influence, like Color does. The chain icon
probably means "link it to something".
Next: hover the chain icon to see what it says, then click it.

## Step 9 -- hover the chain icon

Command: `node $T/real.mjs --step $S --hover-at 1381,264` -> 09.png; tooltip "Size by attribute".

Seen: "Size by attribute". "Attribute" is a database word but I get it: size by a column.
Next: click it.

## Step 10 -- Size by attribute

Command: `node $T/real.mjs --step $S --click "Size by attribute"` -> 10.png

Seen: a list: Influence, Influence rank, Influence percentile; greyed out id and name ("Cannot be
used: Holds groups, not amounts" -- clear enough). Plain choice.
Next: click "Influence".

## Step 11 -- size by Influence

Command: `node $T/real.mjs --step $S --click "role=option:Influence"` -> 11.png

Seen: now the dots differ in size: a big dark one in the middle, another big one at the bottom where
the fan of lines meets, a few medium. Size row says "1 to 3". The key top left now has two rows:
"Size: Influence" and "Color: Influence", both 0.003299 to 0.07543.
**Part 3 done: bigger dots = more influential characters.**
Next: names. Click the plus next to Label.

## Step 12 -- plus next to Label

Command: `node $T/real.mjs --step $S --click-at 1419,332` (button "Add label line") -> 12.png

Seen: a Label picker: Attributes id, name; then Influence, Influence rank, Influence percentile.
"name" is what I want.
Next: click "name".

## Step 13 -- label by name

Command: `node $T/real.mjs --step $S --click "role=option:name"` -> 13.png

Seen: names are written above the dots now (Myriel at the big bottom dot, Valjean at the big middle
one, Fantine, Thenardier, Javert...). Small type -- on a slide it may be hard to read -- and the
panel says "77 labels, 6 hidden to avoid overlap", so not quite every name shows, but I can live
with that for a first try. The key box at top left sits over a name (Blacheville).
**Part 4 done: names on the drawing.**
Next: a picture file. Nothing on screen says Export or Download; I will try the menu (three lines)
top left.

## Step 14 -- main menu

Command: `node $T/real.mjs --step $S --click-at 23,20` (button "Main menu") -> 14.png

Seen: Back to start, New project, Open..., Save, Save as, Save local copy, Export... (Ctrl+E),
Rename, Settings, Keyboard shortcuts, Help. "Export..." is the one, like in Excel.
Next: click Export...

## Step 15 -- Export dialog

Command: `node $T/real.mjs --step $S --click "Export..."` -> 15.png

Seen: Export dialog, Image tab: preset "To share -- PNG, 2x", View "Current view", size, PNG, canvas
color background. A preview that looks like it includes the little key box in the corner (tiny in
the preview). Bottom: "Saved to this computer only; nothing is uploaded." -- exactly what I need
to read with donor data. Buttons Cancel, Copy, Export.
Next: click Export, defaults are fine for a document.

## Step 16 -- Export

Command: `node $T/real.mjs --step $S --click "role=button:Export"` -> 16.png; tool: "a file was saved:
les-miserables_current-view.png, 1806 x 1720"

Seen: a note "Exported les-miserables_current-view.png". Opened the file: the drawing with the key in
the top-left corner ("Size: Influence", "Color: Influence", both 0.003299 to 0.07543), the bigger
dark dots are Valjean (middle), Myriel (bottom), Fantine, Javert-area etc. The key is readable. The
names, though, are tiny and a bit blurry on the picture -- most are unreadable at slide size, and
"Valjean", the most important name, sits on top of his own big dot and can hardly be read.
**Part 5 done: I have a picture file with its key.** But for the board I would want bigger names.
Next: one quick try at bigger names -- there is an "Aa" next to the Label line; I will click it.

## Step 17 -- the "Aa" button

Command: `node $T/real.mjs --step $S --click-at 1220,362` (button "Label position") -> 17.png

Seen: "Label position" -- a 3x3 grid of dots for where the name sits. Not text size. Hesitated: the
"Aa" looked like a font button, it is not.
Next: one last try -- click the "Abc name" box itself in case text size lives there; if not, I stop.

## Step 18 -- the "Abc name" box

Command: `node $T/real.mjs --step $S --key Escape --click-at 1348,362` (button "Label, Above: name") -> 18.png

Seen: just the same attribute list again (name, id, Influence...). No text size. That is two dead
ends for bigger names; I stop here and would ask the vendor's help with that later.

## End

Command: `node $T/real.mjs --end $S`

## Debrief (in character, Grace)

**Did I finish?** Yes, all five parts:

1. On screen: opened the Les Miserables sample from the start page; Nodes 77 matched "77 characters".
2. Who matters most: Analyze (flask) -> PageRank ("Start here") -> Run. It shows up as "Influence".
3. Bigger dots: Influence -> Style -> plus next to Shape -> Size -> chain icon "Size by attribute"
   -> Influence. Size went to "1 to 3".
4. Names: plus next to Label -> name.
5. Picture with key: Main menu -> Export... -> Export. File les-miserables_current-view.png, with the
   key box in the corner.

**What the sizes and colors stand for:** both stand for the same thing, "Influence" (the PageRank
score -- characters tied to other well-connected characters). Bigger and darker brown = more
influential: Valjean in the middle, then Myriel (bottom), Fantine, and a few others. The key gives
the range as 0.003299 to 0.07543, numbers I could not explain to a board -- I would say "bigger,
darker = more central to the story".

**Ease: 5 out of 7.** Each step had a plain door once I found it, and I liked seeing "files are read
on this computer and never uploaded" on the start page and "nothing is uploaded" in Export.

**Where I hesitated or got confused:**

- Choosing between Degree and PageRank: the names are jargon; I went with the "Start here" tag.
- Making dots bigger: there is no "Size" row until you press the plus next to "Shape", and then the
  size is a fixed "1" -- I had to guess that the chain icon links it to Influence (tooltip "Size by
  attribute" confirmed it). Color was linked automatically, size was not.
- The colors are all shades of orange-brown; most dots look the same, only the very top few stand
  out.
- The key numbers (0.003299 to 0.07543) mean nothing to my readers; I would want "low" / "high" or
  ranks.
- Names on the exported picture are tiny and blurry; Valjean's name sits on top of his own big dot.
  6 names are hidden "to avoid overlap". I could not find a text-size control: "Aa" next to Label
  is only the position grid, and the "Abc name" box only picks the column. For a board slide this
  is the part that is not good enough yet.
- The key box on screen covers a character's name (Blacheville) in the top-left corner.
