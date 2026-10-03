# Session: label every character (Les Miserables sample) -- the class-project student

Participant: the student with a class project (study/personas/class-project-student.md).
Task as given: "You have never used this program before. You will practice on the ready-made
network of characters from the novel Les Miserables that comes with the program, not on your own
data. Right now only a few characters have their names written on the drawing. Get every
character's name written next to its dot."

All commands run from design/ui/prototype. Renders are in
tmp/round-8-sessions/r8-t10--class-project-student/. `$D` below stands for that folder's absolute path.

## Step 1 -- start screen (shots/tasks/r8-t10/01.png)

Think-aloud: "OK, reading it all. Start, Open project or file, New from data. Samples on the
right -- Les Miserables, 77 characters, 'opens with worked examples'. That's the one the
instructions say. There's a big box at the bottom asking about usage data. No thanks. Then the
Les Miserables sample."

## Step 2 -- open the sample

    timeout 120 node app-b/study.mjs --try $D/02.png task:r8-t10 --click "No thanks" --click "Les Miserables"

Saw: the network, orange dots, about thirteen names (Fantine, Myriel, Valjean, Javert, Cosette,
Marius, Gavroche...). A long list on the left: Selection, Notes, "Labels show... 1 node",
PageRank, Louvain, Shortest paths, Density, ... Everything. On the right, a panel titled PageRank
with Fill, Shape, Effects, Label, Tooltip.

Think-aloud: "In the Gephi video the step is literally 'labels'. And there's a row on the left
that starts with 'Labels'. That has to be it. Although it says '1 node', which is weird --
I can see more than one name on the drawing already."

## Step 3 -- first try: the "Labels" row (wrong try 1)

    timeout 120 node app-b/study.mjs --try $D/03.png task:r8-t10 --click "No thanks" --click "Les Miserables" --click "Labels"

Saw: the row highlighted and a dark message at the bottom: "Labels shown anyway (this file):
Valjean. Opens in the inspector (not available yet)." The right panel still said PageRank.

Think-aloud: "'Labels shown anyway'? Shown anyway despite what? And it's only Valjean, but I can
see Fantine and Myriel too, so where do THOSE come from? And 'not available yet' -- so this
button doesn't do anything. Dead end. That was the most obvious place and it isn't the place."

## Step 4 -- second try: "Label" on the right panel (wrong try 2)

    timeout 120 node app-b/study.mjs --try $D/04.png task:r8-t10 --click "No thanks" --click "Les Miserables" --click "Label"

Saw: nothing changed at all. The right panel is still about PageRank.

Think-aloud: "Nothing. I clicked the word Label and nothing happened. Also this panel says
'PageRank' at the top and 'Paints 77 nodes' -- I don't want to label PageRank, I want to label
the characters. That's two strikes. Honestly at this point in class I would raise my hand and
ask: where do I turn on labels? Which of these rows is 'the characters'?"

## Step 5 -- one more guess: the "Everything" row

    timeout 120 node app-b/study.mjs --try $D/05.png task:r8-t10 --click "No thanks" --click "Les Miserables" --click "Everything"

Saw: right panel now "Everything -- Built-in row. Paints 77 nodes, 254 edges", with Fill gray,
Shape faceted sphere, and Effects, Label, Tooltip each with a plus.

Think-aloud: "OK, 'Everything' sounds like all the dots. 77 nodes, that's all the characters.
So the plus next to Label is probably 'add labels'."

## Step 6 -- clicking around the Label plus

    timeout 120 node app-b/study.mjs --try $D/06.png task:r8-t10 --click "No thanks" --click "Les Miserables" --click "Everything" --click "Label"
    timeout 120 node app-b/study.mjs --try $D/07.png task:r8-t10 --click "No thanks" --click "Les Miserables" --click "Everything" --click "Add label"
    timeout 120 node app-b/study.mjs --try $D/08.png task:r8-t10 --click "No thanks" --click "Les Miserables" --click "Everything" --click "+"
    timeout 120 node app-b/study.mjs --try $D/09.png task:r8-t10 --click "No thanks" --click "Les Miserables" --click "Everything" --hover "Add"

Saw: clicking the word "Label" again does nothing. "Add label" and "+" are not names of
anything. Resting the pointer on the plus icons shows tooltips: "Add to Effects", and the one by
Label is "Add to Label".

Think-aloud: "So the word 'Label' is just a heading and the little plus is the actual button.
The tooltip says 'Add to Label', which reads like I'm adding something to a label, not adding
labels. Fine, clicking it."

## Step 7 -- "Add to Label"

    timeout 120 node app-b/study.mjs --try $D/10.png task:r8-t10 --click "No thanks" --click "Les Miserables" --click "Everything" --click "Add to Label"

Saw: a small menu: "Label line", "Show labels".

Think-aloud: "'Show labels'! That's the Gephi word. Don't know what a label line is."

## Step 8 -- "Show labels", then tick it

    timeout 120 node app-b/study.mjs --try $D/11.png task:r8-t10 --click "No thanks" --click "Les Miserables" --click "Everything" --click "Add to Label" --click "Show labels"
    timeout 120 node app-b/study.mjs --try $D/12.png task:r8-t10 --click "No thanks" --click "Les Miserables" --click "Everything" --click "Add to Label" --click "Show labels" --click "Show labels"

Saw: a "Show labels" row with an empty checkbox appeared under Label. I ticked it. It went blue.
The drawing did not change: still the same dozen or so names.

Think-aloud: "Wait, what? I picked 'Show labels' from the menu and then it gives me ANOTHER
checkbox that's off? And I tick it and... nothing. Same names as before. So 'show labels' is on
but the labels aren't shown. This is the moment I'd start to think the program is broken. Maybe
it doesn't know WHAT to write? The other thing in that menu was 'Label line'."

## Step 9 -- add a label line and pick what it says

    timeout 120 node app-b/study.mjs --try $D/13.png task:r8-t10 --click "No thanks" --click "Les Miserables" --click "Everything" --click "Add to Label" --click "Show labels" --click "Show labels" --click "Add to Label" --click "Label line"
    timeout 120 node app-b/study.mjs --try $D/14.png task:r8-t10 --click "No thanks" --click "Les Miserables" --click "Everything" --click "Add to Label" --click "Show labels" --click "Show labels" --click "Add to Label" --click "label"

Saw: the second "Add to Label" did not show the menu again; it went straight to a new row
"Above: Pick an attribute" with a dark list open: Typed text, then "In use (2)": label (Name,
Label), group; other attributes betweenness, degree; Results Louvain, PageRank; Notes. (So my
"Label line" click hit nothing -- the menu never came up.) I picked "label". Now nearly every dot
on the drawing has a name: Zephine, Dahlia, Tholomyes, MotherInnocent, Gribier, Countess,
Napoleon, Champtercier, Jondrette, Child1, Child2, MotherPlutarch, Boulatruelle, BaronessT...
The middle is a pile of overlapping names but they are there.

Think-aloud: "THERE they are. OK so you have to tell it to show labels AND tell it which column
to write. 'label' is the column with the names -- it even says 'Name' next to it. Why wasn't that
the default? In Gephi you just click the T button. The middle is a mess of overlapping names,
but that's the same in Gephi, you fix that with label adjust. The picture has every name on it.
Done."

## After the task

- Succeeded? Yes, I think so -- every dot I can see has a name next to it, including the ones
  out on the edges that had none before.
- Single Ease Question (1 = very difficult, 7 = very easy): 3. I got there, but only on my
  fourth or fifth idea. The row literally called "Labels" was a dead end that said "not
  available yet", the word "Label" in the side panel is not a button, and ticking "Show labels"
  shows nothing until you also pick a column.
- Would I use this instead of my current tool (the Gephi the class taught)? Maybe for the
  sample, not yet for the assignment. I like that the names are already there in a column called
  label, and that it has undo arrows at the top (Gephi doesn't). But for something as basic as
  "turn on names" I needed a tooltip hunt, and if I'd hit that "Show labels does nothing" moment
  the night before the deadline I'd have gone back to Gephi.

## What tripped me up (participant's own words)

1. The left-hand row "Labels show... 1 node" looks like THE labels control, but clicking it says
   "Labels shown anyway (this file): Valjean ... not available yet". It also says 1 node while the
   drawing shows about thirteen names, so I could not tell where the existing names came from.
2. When the sample opens, the right panel is about PageRank, not about the characters. I didn't
   know "Everything" meant "all the dots" until I clicked it.
3. "Label" in the side panel is a heading; the button is the small plus beside it, and its
   tooltip "Add to Label" doesn't say "show names".
4. Choosing "Show labels" from the menu added a checkbox that was OFF; ticking it did nothing
   visible. Names only appeared after a second plus click and picking the "label" column.
5. The second plus click did not show the same menu again; it jumped straight to picking an
   attribute, which surprised me (lucky surprise, but I didn't choose it).
