# Session: size dots by importance, Les Miserables sample -- Tom, the recipe recipient

Task as given by the moderator: "You have never used this program before. You will practice on the
ready-made network of characters from the novel Les Miserables that comes with the program, not on
your own data. Make the drawing show which characters the network depends on most: the more it
depends on a character, the bigger that character's dot. Leave the colors as they are."

Renders are in design/ui/prototype/tmp/round-8-sessions/r8-t09--recipe-recipient/. All commands
were run from design/ui/prototype.

## Step 1 -- the start screen (shots/tasks/r8-t09/01.png)

Thinking aloud: "Okay. Start, recent projects, samples. 'Files are read on this computer and never
uploaded' -- good, I like reading that. There's a box at the bottom asking me to share usage data.
No thanks. Les Miserables, 77 characters, is the first sample on the right. That's the one."

## Step 2 -- open the sample

    timeout 120 node app-b/study.mjs --try .../r8-t09--recipe-recipient/02.png task:r8-t09 --click "No thanks" --click "Les Miserables"

Saw (02.png): the network, all dots orange to dark brown, a few names on it (Valjean, Javert, Marius,
Fantine...). A box at top left says "Color: PageRank 0.00330 to 0.0754". A long list on the left:
Selection, Notes, Labels, PageRank, Louvain, Shortest paths, Density, Link prediction, Top 9 by
de..., Watchlist, For the report, Group 2, Group 8, Betweenness, Everything. The right side says
PageRank, "Measure from Analyze", "Paints 77 nodes", then Fill / Color "Orange to brown", and
below that Shape, Effects, Label, Tooltip each with a plus.

Thinking aloud: "That left list is fifteen rows of things I don't know. PageRank, Louvain,
Betweenness -- I don't know what those are and I'm not learning them at 4 pm. They said leave the
colors alone, fine, the colors are the orange. What I want is the dot size. I don't see the word
'size' anywhere. Size of a dot... that's a shape thing, I'd guess. Shape."

Note: I did not know which of these names means "the network depends on it most". PageRank is the
one already selected and painted, so if anything I'd assume that's it, but that's a guess.

## Step 3 -- open Shape

    timeout 120 node app-b/study.mjs --try .../03.png task:r8-t09 --click "No thanks" --click "Les Miserables" --click "Shape"

Saw (03.png): nothing changed. Shape still closed, plus still there.

Thinking aloud: "I clicked Shape. Nothing happened. Maybe it's the little plus next to it."

    timeout 120 node app-b/study.mjs --try .../04.png task:r8-t09 --click "No thanks" --click "Les Miserables" --click "Add shape"
    -> nothing on screen is called "Add shape"
    timeout 120 node app-b/study.mjs --try .../04.png task:r8-t09 --click "No thanks" --click "Les Miserables" --click "+"
    -> nothing on screen is called "+"
    timeout 120 node app-b/study.mjs --try .../04.png task:r8-t09 --click "No thanks" --click "Les Miserables" --hover "Shape"
    -> tooltip: null

Thinking aloud: "I can't get it to open. Clicking the word does nothing, and the plus doesn't say
what it is when I put the pointer on it. Maybe I clicked the wrong thing. Is there just something
called Size somewhere?"

That is the first failure.

## Step 4 -- look for "Size"

    timeout 120 node app-b/study.mjs --try .../05.png task:r8-t09 --click "No thanks" --click "Les Miserables" --click "Size"

Saw (05.png): the dots look the same. A black message at the bottom: "Selection cleared (PageRank)"
with "Bring it back". The right side changed completely: "Co-appearances, Graph from
miserables.gexf", tabs Style / Layout / Data, a Summary with Nodes 77, Edges 254, Density 0.0868,
"4 more readings not computed", and a stair-step chart labeled "Degree distribution, log-log".

Thinking aloud: "Selection cleared? I didn't ask to clear anything. Whatever I clicked, the dots
are the same size and now the panel is full of numbers and a log-log chart. I don't know if I
broke something. That's twice now. I'd ask her to just send me a PNG."

Stopped here. That is the second failure, and I gave up.

## Afterwards

- Did I succeed? No. The dots are all the same size as when I opened it. I never found where you
  make a dot bigger, and I am not sure which of those names (PageRank, Betweenness, something
  else) means "the network depends on this character most".
- Single Ease Question (1 = very difficult, 7 = very easy): 2. Opening the sample was easy. Finding
  dot size was not, and the second click did something I didn't ask for.
- Would I use this instead of what I use now? No. What I use now is the postdoc sending me a
  picture. The opening part was fine and I liked that it said my files stay on the computer, but
  the moment I had to change anything I was guessing at words like Shape and PageRank, and a click
  cleared something without me meaning to. I wanted to know it worked, and instead I didn't know
  what I'd done.

## Problems seen, in my words

1. No word "size" anywhere on the style side. I guessed Shape; clicking it did nothing visible.
2. The plus next to Shape had no name I could find and showed nothing when I rested the pointer on it.
3. A click I made said "Selection cleared (PageRank)" and swapped the whole right panel. I didn't
   mean to clear anything and didn't know whether that changed the file.
4. The task said "which characters the network depends on most". Nothing on screen says that in
   plain words; the left list is algorithm names.
5. The left list has about fifteen rows; I didn't read it.
