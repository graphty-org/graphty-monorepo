# Session: leave two reminders (Jordan, marketing network analyst)

Task as given: "Leave two reminders for next week: one about the tie between Javert and
Valjean itself (the two share many chapters), and one about the whole circle of characters
around the bishop Myriel. You have never typed your name into this program."

All commands were run from design/ui/prototype. Renders are in
tmp/round-7-sessions/t06--marketing-analyst/.

## Start screen (shots/tasks/t06/01.png)

"OK, the map with a key in the corner, PageRank colors, a list down the left. 'Reminders'...
I don't see the word reminder anywhere. There's a 'Notes' row with a 4 and a 'Notes' icon on
the far left rail. A note is a reminder, close enough. Going there."

## 01 -- open Notes

    timeout 120 node app-b/study.mjs --try $PWD/tmp/round-7-sessions/t06--marketing-analyst/01.png task:t06 --click "Notes"

"Huh, somebody's already been in here. 'Myriel's household and the people he meets in Digne' on
Community 3, and 'They share 17 chapters. This is the edge to keep in the pursuit figure' on
Javert -- Valjean. So these exact two reminders sort of already exist? Whatever, the moderator
said leave mine. No author on any of them, by the way -- I can't tell whose these are. Not a
problem for me today, but on a shared file I'd want that. There's a plus at the top."

## 02 -- hover the plus

    ... --click "Notes" --click "+"          -> nothing on screen is called "+"
    ... --click "Notes" --hover "Add note"   -> 02.png

"Tooltip says 'Add note', shortcut N. Fine."

## 03 -- Add note with nothing selected

    ... --click "Notes" --click "Add note"   -> 03.png

"It opened a box with a chip 'Co-appearances' already in it. That's the whole graph, not the
Javert-Valjean tie. I want it on the line between the two of them. There's a little x on the
chip, but no obvious 'attach to...' picker. I'll cancel and go find the tie first."

## 04 -- click the existing note's 'Javert -- Valjean' chip

    ... --click "Notes" --click "Javert -- Valjean"   -> 04.png

"Clicking the chip on that old note selected the actual tie: right panel says 'Javert --
Valjean, Edge', value 17. 17 chapters, matches the note. Good, that's the thing. Down at the
bottom of that panel: Notes, '1 note . Add note (N)'. Honestly I only found the edge because
someone else's note pointed at it -- I'd never have clicked a hairline between two dots on the
map. If that note hadn't been there I'd have gone to the Edges table."

## 05 -- Add note on the edge

    ... --click "Notes" --click "Javert -- Valjean" --click "Add note"   -> 05.png

"Now the box says 'Javert -- Valjean' on the chip. That's what I want. I'd type 'Next week:
check the 17 shared chapters, keep this tie in the pursuit figure' and hit Save or Ctrl+Enter."

    ... --click "Add note" --click "Save"   -> 06.png, nothing on screen is called "Save"

"(I can't actually type in this test, so Save stays gray. I'll count this one as done -- the
box is on the right thing.) Nothing asked me for a name, which is good, I never set one up."

## 07 -- try to click Myriel on the map

    ... --click "Myriel"   -> 07.png

"Wanted the bishop. It jumped to a row called 'Myriel to Javert' -- a shortest-path thing,
blue. Not what I meant. I want Myriel's people, not a path to Javert."

## 08-09 -- find the clusters

    ... --click "6 groups"                       -> 08.png
    ... --click "6 groups" --click "Table"       -> 09.png

"'Louvain, 6 groups' -- that's the clustering. Clicking it just selected it; the table at the
bottom then showed six communities with size and density, and the left list opened to
Community 1 through 6. Community 3 has a little note bubble with a 2. Which one is Myriel's?
Nothing on this screen says. I'm guessing 3 because the old note said 'Myriel's household...
Community 3'. That's me trusting a stranger's note, not the tool."

## 10 -- select Community 3

    ... --click "6 groups" --click "Community 3"                    -> nothing on screen is called "Community 3"
    ... --click "6 groups" --click "Table" --click "Community 3"   -> 10.png

"OK, selected. 'Paints 10 nodes', color green -- 'covered for Color by PageRank'. So the map
is still all orange and I can't see which ten it is. I wanted it to light up the group so I
could check Myriel's in it. It didn't. Ten nodes, and the little spray around Myriel at the
top right looks like about ten, so... probably."

## 11 -- try the Data tab to see members

    ... --click "Community 3" --click "Data"   -> 11.png

"Oops -- that took me to the whole Data section on the left and dropped my group. Wrong 'Data'.
Back."

## 12-13 -- leave the note on Community 3

    ... --click "Community 3" --click "Add note"   -> nothing on screen is called "Add note"
    ... --click "Community 3" --key n               -> 13.png

"No Add note link for a group in that right panel (it was on the Style tab). The tooltip earlier
said N, so I pressed N. Box opens with chip 'Community 3'. I'd type 'Next week: go through
Myriel's circle -- the Digne people' and save."

## Wrap-up

- Did I succeed? Mostly. The tie note is definitely on the Javert -- Valjean edge. The second
  note is on Community 3, which I think is Myriel's circle, but I never saw the tool confirm
  Myriel is in it -- I took that from someone's old note. If Community 3 is wrong, my reminder
  is on the wrong people. (And I couldn't actually type or save in this test.)
- Single Ease Question: 4 out of 7. The note box itself is easy and putting the thing-it's-about
  on a chip is nice. Getting the right thing selected was the hard part: an edge is a hairline,
  and a cluster doesn't show you its members on the map when another color is on top.
- Would I use this instead of what I use now? For notes, maybe. Today my "notes" are comments in
  a Google Slides deck or a sticky in the notebook, and they're not tied to anything. Pinning a
  note to the actual connection or the actual segment is better than that. But I'd want the
  group to light up when I pick it, a search that finds 'Myriel' and tells me which cluster he's
  in, and some name on notes so my manager knows which ones are mine. And honestly, half the
  reason I found the edge was that the note was already there -- like the Brandwatch dashboards
  where the only way to find a widget is somebody else's saved view.
