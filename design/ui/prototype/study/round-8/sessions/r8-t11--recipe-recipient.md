# Session: rearrange the Les Miserables drawing so clusters are easier to tell apart

Participant: the recipe recipient (Tom, lab manager, never builds networks).
Task as given: "You have never used this program before. You will practice on the ready-made
network of characters from the novel Les Miserables that comes with the program, not on your own
data. The drawing looks crowded in the middle. Try a different way of arranging the dots so the
clusters are easier to tell apart."

All commands were run from `design/ui/prototype`. `$D` is
`design/ui/prototype/tmp/round-8-sessions/r8-t11--recipe-recipient`.

## 01 -- start screen (shots/tasks/r8-t11/01.png)

"OK, a start page. 'Files are read on this computer and never uploaded' -- good, I read that.
Les Miserables is right there under Samples, top of the list. There's a big box at the bottom
asking to collect usage data. I'm saying No thanks, I'm not agreeing to things I didn't read."

## 02 -- open the sample

    timeout 120 node app-b/study.mjs --try $D/02.png task:r8-t11 --click "No thanks" --click "Les Miserables"

"Right. That's a lot. A long list down the left -- PageRank, Louvain, Shortest paths, Density,
Link prediction... I don't know what most of those are and I'm not going to touch them. The
picture is in the middle, all orange dots, and yes, it's a clump in the middle. Now how do I move
them around? I don't see a word like 'arrange'. There are some icons at the bottom with no words
on them. I don't know what a beaker or a cube means here."

## 03 -- try the menu

    timeout 120 node app-b/study.mjs --try $D/03.png task:r8-t11 --click "No thanks" --click "Les Miserables" --hover "Play"

(Tool said: nothing on screen is called "Play". I was guessing at the triangle icon; that's not
its name, so nothing happened.)

    timeout 120 node app-b/study.mjs --try $D/03.png task:r8-t11 --click "No thanks" --click "Les Miserables" --click "Menu"

(Two things matched "Menu"; it opened the main menu, the three lines top left.)

"This is the File menu, more or less. New, Open, Save, Export, 'Apply recipe or style file'...
Settings. Nothing about arranging. But hang on -- on the right side the panel changed, and there
is a tab that says 'Layout'. That's the word, I think. Layout like a slide layout."

## 04 -- click Layout

    timeout 120 node app-b/study.mjs --try $D/04.png task:r8-t11 --click "No thanks" --click "Les Miserables" --click "Main menu" --key Escape --click "Layout"

"A small box popped up near the bottom, titled Layout. Motion: Settled. A button 'Resume layout'
-- I don't want to resume anything, I want a different one. Method: 'Spread Out'. Seed: 7. I
don't know what a seed is here. 'Spread Out' looks like the thing you can change, so I'll click
it."

(Note from me afterward: I meant the tab on the right, but what opened was a box from the bar at
the bottom. I didn't notice the difference at the time; it said Layout, that's all I cared
about.)

## 05 -- the list of methods

    timeout 120 node app-b/study.mjs --try $D/05.png task:r8-t11 --click "No thanks" --click "Les Miserables" --click "Main menu" --key Escape --click "Layout" --click "Spread Out"

"Whoa. A big window. And the picture behind it is gone -- the canvas went blank. Did I break it?
On the right side of this window there's a whole column of numbers: Spring length, Gravity
-1.2, Theta, Drag coefficient, Batches in flight. No. I'm not touching any of that. That's the
postdoc's job.

The list on the left I can read, mostly: Ring, Grid, Spiral, Tree, Two Columns. 'Natural
Grouping' -- that sounds like what she asked for, the clusters. 'Columns by Group' maybe too.
The Size and Weights columns -- 2,000, Any, No -- don't mean anything to me. I'll try Natural
Grouping."

## 06 -- pick Natural Grouping

    timeout 120 node app-b/study.mjs --try $D/06.png task:r8-t11 --click "No thanks" --click "Les Miserables" --click "Main menu" --key Escape --click "Layout" --click "Spread Out" --click "Natural Grouping"

"Something happened. A black bar at the bottom says 'Laid out again: Natural Grouping' and
there's an Undo. Good, there's an undo. I can see dots behind the window and they're in clumps
now, but this window is covering most of the picture. A little grey tip popped up saying 'Rated
for up to 2,000 nodes, ignores edge weights, flat'. I don't know what that means and I don't
care. I want to see the drawing."

## 07 -- try to close the window with Escape

    timeout 120 node app-b/study.mjs --try $D/07.png task:r8-t11 --click "No thanks" --click "Les Miserables" --click "Main menu" --key Escape --click "Layout" --click "Spread Out" --click "Natural Grouping" --key Escape

"Escape did nothing. The window is still there. Fine, there's an X in the corner."

## 08 -- close with the X

    timeout 120 node app-b/study.mjs --try $D/08.png task:r8-t11 --click "No thanks" --click "Les Miserables" --click "Main menu" --key Escape --click "Layout" --click "Spread Out" --click "Natural Grouping" --click "Close"

"There. Now it's six or seven separate clumps around a circle -- one with Myriel, one with
Valjean and Cosette, one with Fantine, one with Javert and the Thenardiers, the student lot with
Marius and Gavroche on the left. That is clearly easier to tell apart than the hairball. The
lines going across the middle are a bit of a mess, but the groups are obvious.

One thing: they're all still the same orange. I can see the clumps because of where they sit,
not because of any color. If the PI asked 'which group is which' I'd be pointing at the screen.
And are these clumps real, or is that just where this method put them? I'd ask her."

## Wrap-up

- Did I succeed? Yes, I think so. The clusters are separated now and the right side says Method:
  Natural Grouping. I could undo it if I had to.
- Single Ease Question (1 = very difficult, 7 = very easy): **4**. Picking the method was easy
  once I had the list. Getting to the list was luck: there's no word for "arrange" anywhere on
  the main screen, the icons at the bottom have no words, and I only found "Layout" because the
  right panel happened to show it after I poked the menu. Then the picture vanished behind a big
  window full of physics numbers, and Escape didn't close it.
- Would I use this instead of my current tool? "My current tool is her sending me a PNG. For
  just looking, no -- this is a lot of screen for what I need. But it opened in the browser,
  said nothing gets uploaded, and the rearranging did work and had an Undo. If she sent me a
  file in this, I could probably cope. I wouldn't go looking for it myself."
