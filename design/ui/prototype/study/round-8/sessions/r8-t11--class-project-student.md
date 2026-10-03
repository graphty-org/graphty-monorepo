# Session: rearrange the Les Miserables drawing so the clusters separate

Participant: the student with a class project (Dev), first time using the program.
Task as given: "You have never used this program before. You will practice on the ready-made
network of characters from the novel Les Miserables that comes with the program, not on your own
data. The drawing looks crowded in the middle. Try a different way of arranging the dots so the
clusters are easier to tell apart."

All commands were run from design/ui/prototype. D below stands for
/home/apowers/Projects/graphty-monorepo/.worktrees/ux-storyboards-mocks-and-study/design/ui/prototype/tmp/round-8-sessions/r8-t11--class-project-student

## Start screen (shots/tasks/r8-t11/01.png)

"OK, Start, Recent projects, Samples. Les Miserables is right there, 77 characters, 'good for a
first look at communities'. That's literally what I want. There's a big box at the bottom asking
to share usage data -- I'll say No thanks, I just want it gone. Then click Les Miserables."

## Step 1 -- open the sample

    timeout 120 node app-b/study.mjs --try D/01.png task:r8-t11 --click "No thanks" --click "Les Miserables"

"Whoa, a lot opened. A list on the left with PageRank, Louvain, Shortest paths, Density... a lot
of this is already done, I guess those are the 'worked examples'. The drawing is in the middle
and yeah, it's crowded around Valjean. In the Gephi tutorial the step is called Layout, so I'm
looking for the word Layout. I don't see it written anywhere. Left side says Graph, Data, Views,
Notes, Assistant. There's a row of little icons at the bottom of the drawing with no words. I'll
just try the word Layout and see."

## Step 2 -- look for Layout

    timeout 120 node app-b/study.mjs --try D/02.png task:r8-t11 --click "No thanks" --click "Les Miserables" --click "Layout"

"Oh, that worked -- it was the play-button icon at the bottom, I think. A little box called
Layout popped up over the drawing: Motion 'Settled', a Resume layout button, Method 'Spread Out',
Seed 7. Also a Layout tab showed up on the right side. I don't know what Seed is. Method is the
thing I want to change, so I'll click Spread Out."

(Moderator note: the participant typed the tutorial word rather than hovering the icons; the
click landed on an icon-only control whose name is Layout. A real first-timer might have had to
hover several unlabeled icons to find it.)

## Step 3 -- see the methods

    timeout 120 node app-b/study.mjs --try D/03.png task:r8-t11 --click "No thanks" --click "Les Miserables" --click "Layout" --click "Spread Out"

"Big list. Spread Out (recommended), Spread Out Flat, Ring, Rings from a Node, Grid, Concentric
Rings, Spiral, Natural Grouping, No Crossings, Scattered, Tree, Two Columns, Columns by Group,
Keep Positions. No ForceAtlas 2, which is the one the tutorial uses, so I can't just copy the
tutorial. On the right there's a pile of numbers -- Spring length, Gravity, Theta, Drag
coefficient, Batches in flight -- no idea, not touching those. The Size column says Any or 2,000,
I guess that's a max number of dots, we have 77 so fine. 'Weights: No' -- not sure what that
means for me.

I want clusters apart. 'Natural Grouping' sounds exactly like that. 'Columns by Group' also
sounds group-y but columns doesn't sound like a network picture. Going with Natural Grouping."

## Step 4 -- pick Natural Grouping

    timeout 120 node app-b/study.mjs --try D/04.png task:r8-t11 --click "No thanks" --click "Les Miserables" --click "Layout" --click "Spread Out" --click "Natural Grouping"

"It changed right away -- there's a black message 'Laid out again: Natural Grouping' with an Undo
button. Nice, undo exists, the Gephi people complained about that. The engine changed to
'Spectral', whatever that is. But the big box is covering most of the drawing, I can only see
the edges of it. I need to close this."

## Step 5 -- try Escape to close it

    timeout 120 node app-b/study.mjs --try D/05.png task:r8-t11 --click "No thanks" --click "Les Miserables" --click "Layout" --click "Spread Out" --click "Natural Grouping" --key Escape

"Escape didn't close it. Just a little tooltip popped up over the list ('Rated for up to 2,000
nodes, ignores edge weights, flat'). Annoying. There's an X in the corner, I'll click that."

## Step 6 -- close with the X

    timeout 120 node app-b/study.mjs --try D/06.png task:r8-t11 --click "No thanks" --click "Les Miserables" --click "Layout" --click "Spread Out" --click "Natural Grouping" --click "Close"

"There it is. Now it's like six or seven little clumps spread around a big circle: Marius and
Gavroche and Enjolras and the students on the left, Valjean and Cosette on the right, Myriel up
top, Fantine's group, Javert / Eponine / Thenardier at the bottom. Way less crowded in the middle,
you can actually see the groups. The lines going between groups are kind of a messy web in the
middle but the dots themselves are clearly bunched. Everything's still all orange though, so the
groups are only told apart by where they sit, not by color. For the class I'd want to color by
Louvain next, but that wasn't the task. I'm calling this done."

## Outcome

- Did I succeed? Yes, I think so. The clumps are clearly separate in the picture.
- Single Ease Question: 5 of 7. Finding the method list was quick once I hit Layout, and the
  names are plain English, which helped. Minus points: the word Layout isn't written anywhere on
  the main screen (it hides behind an unlabeled icon), none of the names match the tutorial's
  ForceAtlas 2, the box covered the result so I couldn't see what I'd done, and Escape didn't
  close it.
- Would I use this instead of Gephi? Probably, for the class. The sample opened with stuff already
  done, there's an undo, and the method names say what they do. But I'd have to translate every
  tutorial step because the words are different, and the right-hand pile of numbers (Theta, Drag
  coefficient, Batches in flight) scares me more than it helps.

## Observations for the designers

1. The Layout control is an icon-only button in the floating toolbar; the tutorial word "Layout"
   appears nowhere on screen until it is opened. Typing the word happened to work; scanning would
   have meant hovering unlabeled icons.
2. Choosing a method applies it at once behind the open dialog; the dialog hides most of the
   result, so the participant could not judge the change without closing it.
3. Escape did not close the Layout dialog (it raised a row tooltip instead); only the X did.
4. Method names are plain-language but give no bridge to tutorial vocabulary (ForceAtlas 2,
   Fruchterman-Reingold), so a student following a Gephi tutorial cannot map steps directly.
5. Expert engine parameters (Theta, Drag coefficient, Batches in flight, Refit interval) are shown
   open beside the method list for a first-time user.
6. The "Size" and "Weights" columns in the method list were not understood.
