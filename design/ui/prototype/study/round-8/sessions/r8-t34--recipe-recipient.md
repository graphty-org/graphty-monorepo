# Session: keep a camera angle under a name, then show the kept angles in order

Participant: Tom, lab manager who receives files and never builds them (study/personas/recipe-recipient.md).

Task as given: "The Les Miserables network is open (example data, not your own). You have turned
the drawing to an angle that tells the story well. Keep that exact angle under a name so you can
show it again, then show your kept angles one after another as you would in a meeting."

Renders are in tmp/round-8-sessions/r8-t34--recipe-recipient/. Every command ran from
design/ui/prototype.

## Step 1 -- the start screen (shots/tasks/r8-t34/01.png)

Think-aloud: "OK, the picture is there, orange dots, a legend that says PageRank. Fine, not mine
anyway. I want to keep this angle. Down the left I see Graph, Data, Views, Notes, Assistant.
'Views' with a bookmark -- that's the closest thing to 'keep this'. The left list here is all
things like Louvain and Shortest paths, I'm not touching those."

## Step 2 -- open Views

    timeout 120 node app-b/study.mjs --try .../02.png task:r8-t34 --click "Views"

Saw: a "Views" panel listing Whole cast, Valjean's circle, From above, each with a little picture
and a checkbox, and a small gray "In tour" over the checkboxes. A plus, a play triangle and three
dots at the top.

Think-aloud: "So somebody already kept some. Good, that's the place. The plus is probably 'add
one'. The checkboxes -- 'In tour'? I suppose ticked ones get shown. Why is 'From above' not
ticked? I'll leave it."

## Step 3 -- try the plus (and find out what it is called)

    timeout 120 node app-b/study.mjs --try .../03.png task:r8-t34 --click "Views" --click "+"
    -> nothing on screen is called "+"

Then I rested the pointer on the plus (the harness needs a name for that; it took me a few guesses
-- "Add view", "New view" did not exist, "Add" hit a different plus, "Add note N" on the right):

    timeout 120 node app-b/study.mjs --try .../04.png task:r8-t34 --click "Views" --hover "Save view"
    -> tooltip: "Save view"

Think-aloud: "'Save view'. Yes, that's what I want. I'd have just clicked the plus anyway."
(Note: the guessing was the test harness, not the screen; a real pointer resting on the plus
shows "Save view" straight away.)

## Step 4 -- save it

    timeout 120 node app-b/study.mjs --try .../05.png task:r8-t34 --click "Views" --click "Save view"

Saw: a new row "View 4" with its own little picture, the name highlighted in an edit box, ticked
for the tour.

Think-aloud: "It went straight to asking for a name, good, it's already selected so I'd just type
over it -- 'The barricade', something like that. Nothing asked me where it gets saved, but the top
bar says 'Local only', so I assume it stays on this laptop."

(The harness cannot type text, so I pressed Enter and kept the offered name.)

    timeout 120 node app-b/study.mjs --try .../06.png task:r8-t34 --click "Views" --click "Save view" --key Enter

Saw: "View 4" in the list, outlined, ticked.

## Step 5 -- show them one after another

    timeout 120 node app-b/study.mjs --try .../07.png ... --key Enter --hover "Present"
    -> tooltip: "Present"
    timeout 120 node app-b/study.mjs --try .../08.png ... --key Enter --click "Present"

(Found the name after trying "Play" / "Play tour" / "Start tour", which do not exist; on screen
the play triangle next to the plus shows "Present".)

Saw: the panels gone, the drawing filling the screen, the legend kept in the corner, a caption at
the bottom "Whole cast -- The characters fall into communities of people who share chapters.",
"1 of 3" with arrows, "Present, Esc to leave" at the top.

Think-aloud: "That's what I'd put on the projector. The legend stayed, good. 1 of 3 -- three,
because 'From above' was unticked. OK, that's what the tick is for."

    timeout 120 node app-b/study.mjs --try .../09.png ... --click "Present" --click "Next"
    timeout 120 node app-b/study.mjs --try .../10.png ... --click "Present" --click "Next" --click "Next"

Saw: 2 of 3 "Valjean's circle", zoomed in on Valjean with a caption. Then 3 of 3 "View 4", no
caption, the forward arrow grayed out.

Think-aloud: "There's mine, last. But -- it looks exactly like the first one, 'Whole cast'. Same
picture. Did it keep my angle, or did it just keep the normal picture? In this test the drawing
was already where I had it, so maybe the two are just the same. In a meeting I'd want to know.
Also mine has no sentence under it like the others do, and it's called 'View 4' because I didn't
get to name it. The others had a little description; I didn't see where that came from."

## Outcome

Did I succeed? "I think so. I kept it, it's in the list, and it came up third when I presented.
I'm not fully sure it's MY angle and not just the default picture, because it looks the same as
the first one."

Single Ease Question: 6 of 7. "The Views tab and the plus were where I looked. Present did what I
expected. The only bits I hesitated over were what the checkboxes do and whether it really kept my
angle."

Would I use this instead of my current tool? "For a meeting, yes, over her sending me a PNG
in PowerPoint -- the pictures are live and in order and the legend stays on. But I'd want her to
set up the descriptions; I wouldn't know how to add those. And I'd check once with IT that 'Local
only' means what it says."
