# Session: rearrange the Les Miserables network so clusters separate -- reporter persona ("Ruth")

Persona: study/personas/data-journalist.md (a reporter with a contacts sheet, first-time graph tool user).

Task as given: "You have never used this program before. You will practice on the ready-made
network of characters from the novel Les Miserables that comes with the program, not on your own
data. The drawing looks crowded in the middle. Try a different way of arranging the dots so the
clusters are easier to tell apart."

Start screen: shots/tasks/r8-t11/01.png. Renders: tmp/round-8-sessions/r8-t11--data-journalist/.
All commands were run from design/ui/prototype with
`D=.../tmp/round-8-sessions/r8-t11--data-journalist`.

## Steps, thinking aloud

**Start screen.** "A welcome page. There's a box at the bottom asking about usage data, so No
thanks. Les Miserables is the first sample on the right. Click it."

    timeout 120 node app-b/study.mjs --try $D/01.png task:r8-t11 --click "No thanks" --click "Les Miserables"

**01.png -- the sample is open.** "That's busy: a long list on the left (PageRank, Louvain,
Shortest paths, Watchlist, For the report...), and a lot on the right about PageRank. The
picture really is a tangle around Valjean. I want to rearrange the dots, but nothing in the left
list says arrange or layout. There's a small row of icon buttons under the picture. I'll rest my
pointer on them."

    timeout 120 node app-b/study.mjs --try $D/02.png task:r8-t11 --click "No thanks" --click "Les Miserables" --hover "Layout"
    timeout 120 node app-b/study.mjs --try $D/03.png task:r8-t11 --click "No thanks" --click "Les Miserables" --hover "Arrange"

**02.png / 03.png.** "The second icon, a play-button triangle, is called 'Layout'. I'd have
guessed play meant 'animate' or 'run'. 'Layout' is the Gephi word, so I'll take it. Nothing is
called 'Arrange', which is the word I'd have used."

    timeout 120 node app-b/study.mjs --try $D/04.png task:r8-t11 --click "No thanks" --click "Les Miserables" --click "Layout"

**04.png -- a small Layout box.** "Motion: Settled, with a 'Resume layout' button. Method: Spread
Out. Seed: 7. I don't know what a seed is and I'm leaving it alone. 'Spread Out' looks like the
current choice, so clicking it should show me the others." (The panel on the right switched to
graph facts at the same time: 77 nodes, 254 edges, density. I didn't need them for this.)

    timeout 120 node app-b/study.mjs --try $D/05.png task:r8-t11 --click "No thanks" --click "Les Miserables" --click "Layout" --click "Spread Out"

**05.png -- a big list of methods.** "Fifteen choices: Spread Out (Recommended), Ring, Grid,
Spiral, Natural Grouping, No Crossings, Tree, Columns by Group... The right half is physics I don't
understand: spring coefficient, theta, drag coefficient, refit interval, batches in flight. I'm not
touching any of that. The box also hides the picture now, so I can't see what each one does.
Two names match my task: 'Natural Grouping' and 'Columns by Group'. Natural Grouping sounds closest
to 'clusters easier to tell apart'. The Size column says 2,000 and the picture has 77, so I assume
it's fine."

    timeout 120 node app-b/study.mjs --try $D/06.png task:r8-t11 --click "No thanks" --click "Les Miserables" --click "Layout" --click "Spread Out" --click "Natural Grouping"

**06.png.** "A message says 'Laid out again: Natural Grouping' with an Undo button, which is
reassuring. Behind the box I can see the dots have moved, but the box covers most of them.
Escape usually closes things."

    timeout 120 node app-b/study.mjs --try $D/07.png task:r8-t11 --click "No thanks" --click "Les Miserables" --click "Layout" --click "Spread Out" --click "Natural Grouping" --key Escape

**07.png.** "Escape didn't close it. A tooltip appeared instead ('Rated for up to 2,000 nodes,
ignores edge weights, flat'). Fine, the X in the corner."

    timeout 120 node app-b/study.mjs --try $D/08.png task:r8-t11 --click "No thanks" --click "Les Miserables" --click "Layout" --click "Spread Out" --click "Natural Grouping" --click "Close"

**08.png -- the new picture.** "Much better. The pile in the middle is gone and I can see separate
knots: the students around Marius, Enjolras and Gavroche on the left; Valjean and Cosette on the
right; Fantine's group under them; Myriel's group at the top; Javert, Eponine and the Thenardiers
at the bottom. The long lines between knots show who bridges them, which is the kind of thing I'd
want for a story. Two complaints: every dot is still the same orange, so the groups are told apart
only by distance, not color; and the names in the student knot are printed on top of each other.
The right-hand panel now says Method: Natural Grouping, so it seems to have stuck. I'm done."

## Outcome

- **Did I succeed?** Yes, I think so. The clusters are clearly apart now.
- **Single Ease Question:** 5 of 7. Finding the control took a guess (a play icon named "Layout"),
  and the method list asked me to choose without letting me see the picture. Once I picked a name
  that matched my goal, it worked and I could undo it.
- **Would I use this instead of my current tool?** For this job, probably yes: rearranging in
  Gephi means picking an algorithm and pressing Run and Stop, and here a named choice did it in
  one click with an Undo. But I'd want the groups colored, and I'd want to know what "Natural
  Grouping" actually does before I put a picture in front of an editor. Nothing in the list
  explained it in plain words, only the rated size and "ignores edge weights".

## Problems noticed (in my words)

1. The arrange control is an unlabeled play-triangle icon; "Layout" only shows on hover, and play
   reads as "run an animation". I looked for "Arrange" first.
2. The method list opens on top of the picture, so I couldn't watch the result while choosing,
   and after choosing I had to close the box to see anything.
3. Escape didn't close the Layout box.
4. Half of the box is engine settings (spring coefficient, theta, drag, batches in flight) with no
   explanation; it made the box feel like it was for someone else.
5. No plain-language description of what each method does. "Natural Grouping" and "Columns by
   Group" both sounded right; I picked by name alone.
6. After the rearrangement the knots are separate but all one color, and the labels in the densest
   knot overlap.

## What went well

- "Natural Grouping" is a name a non-expert can match to "clusters easier to tell apart".
- The "Laid out again: Natural Grouping -- Undo" message made trying a method feel safe.
- The result looked clearly better: distinct, readable groups.
