# Session: leave a note on a whole community and on a whole path, then find both again

Participant: the Gephi holdout (Dr. Mara Lindqvist, fictional), playing at 1440x900.

Task as given: "The Les Miserables network is open with the program's circles of characters
shown (example data, not your own). Leave one reminder on the whole circle around the bishop
Myriel, and one on the chain the program already traced between Valjean and Javert as a whole,
not on any one character. Then locate both reminders again."

Renders are in design/ui/prototype/tmp/round-8-sessions/r8-t23--gephi-holdout/. Every command
was run from design/ui/prototype. D below stands for that render folder.

## Start (shots/tasks/r8-t23/01.png)

"Les Mis, fine, I know this one by heart -- 77 characters. Left is a tree: Louvain with six
communities, a second Louvain with seven, PageRank, Shortest paths with two paths under it. So
'circles' means modularity classes. Which class is Myriel's? The list does not say -- it is
Community 1 to 6 with node counts, the ids mean nothing, as usual. In Gephi I would click Myriel in
the graph and read modularity_class in the Data Lab. Let me click Myriel."

## Step 1 -- click Myriel

    timeout 120 node app-b/study.mjs --try D/02.png task:r8-t23 --click "Myriel"

"That did not select the character, it selected the path 'Myriel to Javert' in the list. Wrong
thing. Not what I wanted, but not harmful. I'll go through the communities instead. Myriel's
household is small -- the ten-node classes are the likely ones."

## Step 2 -- look at the ten-node communities

    timeout 120 node app-b/study.mjs --try D/03.png task:r8-t23 --click "Community 3"
    timeout 120 node app-b/study.mjs --try D/04.png task:r8-t23 --click "Community 4"

"Community 3: Hub Myriel, nine links inside, and the members list is Myriel, Mlle.Baptistine,
Mme.Magloire, Napoleon, Count, OldMan... That is the Digne household. Good, and I got there by a
hub field rather than by guessing -- that is actually nicer than reading the class number off a
column. It already has '2 notes'. Community 4 is Fantine's and says 'No notes. Add note (N)'. So
the note lives on the community itself. Fine."

## Step 3 -- note on Community 3

    timeout 120 node app-b/study.mjs --try D/05.png task:r8-t23 --click "Community 3" --click "Add note"
    timeout 120 node app-b/study.mjs --try D/06.png task:r8-t23 --click "Community 3" --click "Add note" --click "Write a note" --key a --key Control+Enter

"The left side became a Notes list with a box at the top: 'Note on: Community 3', a text field,
Save with Ctrl+Enter. It tells me the note is saved without a name -- I don't care. My click on
'Write a note' found nothing (it is only placeholder text), but the cursor was already in the field,
so typing and Ctrl+Enter saved it. The note is at the top, tagged 'Community 3', 8 notes in this
graph now. One done."

## Step 4 -- the Valjean-Javert path

    timeout 120 node app-b/study.mjs --try D/07.png task:r8-t23 --click "Community 3" --click "Add note" --key a --key Control+Enter --click "Graph" --click "Valjean to Javert"

"Back to the graph tree, select 'Valjean to Javert' under Shortest paths. Right side: path, 2
nodes, 1 edge, 17 shared chapters, Valjean start, Javert end. And the Notes section says
'Note on: Path Valjean to Javert'. That is exactly the 'whole chain, not one character' the task
wants, and it says so in words. Good.

But wait -- the tree changed under me. 'Louvain 2, 7 groups' was at the top before, now it is
gone, and Louvain has collapsed. I did not delete anything. Where did the second run go? In Gephi
I'd at least know which column I overwrote. This makes me nervous."

## Step 5 -- note on the path

    timeout 120 node app-b/study.mjs --try D/08.png task:r8-t23 --click "Community 3" --click "Add note" --key a --key Control+Enter --click "Graph" --click "Valjean to Javert" --click "Add note" --key b --key Control+Enter

"Saved. Notes list: 'b' tagged 'Valjean to Javert', then 'a' tagged 'Community 3'. 9 notes. The
path panel says '1 note -- Open in Notes'. Both reminders exist. The chip on the note just says
'Valjean to Javert' -- it does not say 'path', so in a long list it could be mistaken for a note
on those two characters, like the older 'Valjean / Javert' note below it with two separate chips.
The color square helps a bit, but I'd rather it said Path."

## Step 6 -- find them again from the graph tree

    eval timeout 120 node app-b/study.mjs --try D/09.png task:r8-t23 ...same steps... --click Graph --click Louvain
    eval timeout 120 node app-b/study.mjs --try D/10.png task:r8-t23 ...same steps... --click Graph --click "1 note"
    timeout 120 node app-b/study.mjs --try D/11.png task:r8-t23 ...same steps... --click Graph --click "Louvain, 1 note"
    timeout 120 node app-b/study.mjs --try D/12.png task:r8-t23 ...same steps... --click Graph --click "Louvain, 1 note" --key ArrowRight

(The first two were ambiguous: "Louvain" matched a bottom tab and the tree row; "1 note" matched
three things. I clicked the tree row by its full name.)

"In the tree, the path row now reads 'Valjean ... 2 nodes, 1 note'. I open Louvain with the arrow
key and Community 3 reads '10 nodes, 3 notes' -- the two it had plus mine. So both are findable
from the tree, and both are in the Notes list. Done.

One thing is wrong, though: the 'Notes' row at the top of the tree still says '4 items', while the
Notes list says 9 notes in this graph. Which is it? If a count disagrees with another count on the
same screen I stop trusting both."

## Outcome

- Succeeded: yes. One note on Community 3 (Myriel's community, as a whole), one on the path
  Valjean to Javert (as a whole); both visible in the Notes list and as note counts on their rows.
- Single Ease Question: 5 of 7. Finding which community is Myriel's took two guesses, because the
  communities are listed by number and clicking Myriel's name picked a path instead.
- Would I use this instead of Gephi? No. "For teaching annotation, maybe. Gephi has nothing like
  notes attached to a modularity class or a path, and the 'Hub: Myriel' line is genuinely useful.
  But a row in my tree vanished when I did nothing to it, and two note counts disagree on one
  screen. I can't build a course on a tool that loses track of its own list."

## Problems seen

1. The second Louvain run ("Louvain 2, 7 groups") disappeared from the tree after returning to the
   Graph section; nothing explained why. (07.png vs 01.png) -- severity high for her: looks like data loss.
2. The tree's "Notes" row says 4 items while the Notes list says 8, then 9, notes in this graph.
   (11.png, 12.png vs 06.png, 08.png)
3. No way from the community list to tell which community holds a given character without opening
   each one; clicking a character name matched a path row instead. (02.png)
4. The note chip for the path reads "Valjean to Javert" with no "Path" word, easy to confuse with
   a note on the two characters. (08.png)
5. Community 3's name is truncated to "Comm..." in the tree once it carries a note count. (12.png)
