# Session: label the bishop's circle with name and note count -- Tom, the recipe recipient

Task as given: "Have each character in the circle around the bishop carry two pieces of text in
the drawing: what they are called on top, and underneath it how many remarks have been written
about them." Data: Les Miserables co-appearances.

Renders: tmp/round-7-sessions/t21--recipe-recipient/ (02.png to 15.png). Start screen:
shots/tasks/t21/01.png. All commands run from design/ui/prototype; D is that render folder.

## Start (01.png)

"All right. Orange dots, a legend in the corner. The bishop -- that's Myriel, up on the right,
with the little spokes coming off him. Some of the dots have names, most don't. So I need every
dot around Myriel to show its name, and under it a count of... remarks. Notes? There's a 'Notes 4'
row on the left. Let me start by picking Myriel."

## Step 1 -- click the bishop (02.png)

    timeout 120 node app-b/study.mjs --try $D/02.png task:t21 --click "Myriel"

"That didn't pick the dot. It picked a row on the left called 'Myriel to Javert', and the panel on
the right says 'Path, from Shortest paths, paints 3 nodes'. That's not what I wanted. I wanted his
group, not a path to Javert."

## Step 2 -- try 'Selection' (03.png)

    timeout 120 node app-b/study.mjs --try $D/03.png task:t21 --click "Selection"

"'Paints 0 nodes.' So nothing is selected. Yellow, size 1.45, opacity 40. No idea how to put
anything in it. I can't click the dots."

## Step 3 -- the search box (04.png)

    timeout 120 node app-b/study.mjs --try $D/04.png task:t21 --click "Find rows and notes"

"It highlights the box but I have nothing to search for that would get me 'the people around
Myriel'. Moving on."

## Step 4 -- open the table (05.png)

    timeout 120 node app-b/study.mjs --try $D/05.png task:t21 --click "Table"

"A spreadsheet. 77 nodes. Label, group, degree, PageRank, rank, betweenness. No column for remarks
or notes. Myriel isn't on the first screen. This is a lot of numbers I don't need."

## Step 5 -- Louvain (06.png)

    timeout 120 node app-b/study.mjs --try $D/06.png task:t21 --click "Louvain"

"It switched the table to 'Louvain', six communities. There's a Notes column, Community 3 has a
little 2 in it. I don't know which community is Myriel's. I don't know what Louvain is and I'm not
learning it at 4 pm."

## Step 6 -- Label on the right (07.png)

    timeout 120 node app-b/study.mjs --try $D/07.png task:t21 --click "Label"

"There's a 'Label' with a plus on the right. That sounds like the thing. I clicked it. Nothing
happened. Did it do anything? It still says PageRank at the top -- would that have put labels on
all 77 anyway? I don't know."

## Step 7 -- rest on the bishop (08.png)

    timeout 120 node app-b/study.mjs --try $D/08.png task:t21 --hover "Myriel"

"Pointing at Myriel just lights the 'Myriel to Javert' row again. The dot itself does nothing for
me."

## Step 8 -- Notes (09.png)

    timeout 120 node app-b/study.mjs --try $D/09.png task:t21 --click "Notes"

"Now this is readable. A list of notes. The first one: 'Myriel's household and the people he meets
in Digne' -- tagged 'Community 3'. So that's the bishop's circle. Good, someone wrote it down.
That's the most useful thing I've seen."

## Step 9 -- Community 3 (10.png)

    timeout 120 node app-b/study.mjs --try $D/10.png task:t21 --click "Notes" --click "Community 3"

"Right panel says 'Community 3, Group from Louvain, paints 10 nodes'. Ten people. Green swatch,
but the dots on the picture are still orange -- it says 'covered for color by PageRank'. I don't
care about the color. There's Label with a plus again."

## Step 10 -- Label again (11.png to 15.png)

    timeout 120 node app-b/study.mjs --try $D/11.png task:t21 --click "Notes" --click "Community 3" --click "Label"
    timeout 120 node app-b/study.mjs --try $D/12.png task:t21 --click "Notes" --click "Community 3" --hover "Add label"
      -> nothing on screen is called "Add label"
    timeout 120 node app-b/study.mjs --try $D/13.png task:t21 --click "Notes" --click "Community 3" --hover "Add"
      (also tried "Add Label", "Show Label", "Add a label": nothing on screen is called that)
    timeout 120 node app-b/study.mjs --try $D/14.png task:t21 --click "Notes" --click "Community 3" --hover "Label"
    timeout 120 node app-b/study.mjs --try $D/15.png task:t21 --click "Notes" --click "Community 3" --click "Style" --click "Label"

"Clicked Label. Nothing. Pointed at the plus -- no hint what it is. The only 'Add' on screen is
'Add note' up top, which is the wrong thing; I'd be writing a remark, not showing how many there
are. Clicked Style, clicked Label again. Still nothing opens. That's twice the obvious button has
done nothing. I'll ask her to just send me a PNG with the names on."

## Outcome

- Succeeded? No. I found which group is the bishop's (Community 3, ten people) only by reading
  a note, never by clicking the bishop. I never got a single name or count onto the picture.
- Single Ease Question: 2 of 7.
- Would I use this instead of what I do now? No. "Clicking the dot picked a path to Javert, and the
  Label plus did nothing, twice. The notes list was the one part that made sense to me. For this
  I'd email the postdoc."

## What stood out (in his words)

- "I clicked the bishop and it chose 'Myriel to Javert'."
- "'Selection -- paints 0 nodes.' How do I put people in it?"
- "Label, plus. Clicked it. Nothing moved. Did it do anything?"
- "Nowhere does it show how many remarks a person has. The notes list has tags, but no count per
  person."
- "The note telling me Community 3 is Myriel's household was the only way I found his circle."
