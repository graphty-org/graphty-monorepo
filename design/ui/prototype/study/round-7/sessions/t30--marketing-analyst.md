# Session: keep an angle, title it, step through kept angles -- Jordan (marketing network analyst)

Task as given: "You hit on an angle on the drawing that tells the story well. Keep it so you can
come back to it, give it a title, and then step through your kept angles one after another as you
would for your manager."

All commands were run from design/ui/prototype. `D` below is
`/home/apowers/Projects/graphty-monorepo/.worktrees/ux-storyboards-mocks-and-study/design/ui/prototype/tmp/round-7-sessions/t30--marketing-analyst`.

## Start screen (shots/tasks/t30/01.png)

Jordan: "OK, the left panel already says Views, 'No saved views. Save view (+)'. That's... actually
exactly the word I'd look for. Fine. The map is orange-by-PageRank, sized by degree, legend top
left. I'll take this as my angle and save it."

## Step 1 -- Save view

    timeout 120 node app-b/study.mjs --try $D/01.png task:t30 --click "Save view"

Saw: a row "View 4" appears with its name field selected for editing, a thumbnail and a checked
box under a column header "In tour". But three other rows also appeared: "Whole cast", "Valjean's
circle", "From above". A second ago it said I had no saved views.

Jordan: "Wait, where did those three come from? It said 'No saved views'. Did I just load somebody
else's? Hmm. Anyway -- 'View 4', name box is highlighted, so I just type over it. Good, that's how
renaming a sheet tab works."

## Step 2 -- type a title

    timeout 120 node app-b/study.mjs --try $D/02.png task:t30 --click "Save view" --type "The barricade crowd" --key Enter
    timeout 120 node app-b/study.mjs --try $D/03.png task:t30 --click "Save view" --type "The barricade crowd"

Saw: after Enter the row still reads "View 4"; without Enter the box still shows "View 4"
selected. My title did not stick either way.

Jordan: "I typed 'The barricade crowd' and it still says View 4. Did it not take? ... OK, I'll
come back to the name. If this were real I'd be annoyed already -- the one thing I wanted was a
title the VP reads."

## Step 3 -- find the way to step through

    timeout 120 node app-b/study.mjs --try $D/04.png task:t30 --click "Save view" --key Enter --hover "Play"
    -> nothing on screen is called "Play"
    timeout 120 node app-b/study.mjs --try $D/05.png task:t30 --click "Save view" --key Enter --hover "Present"

Saw: the triangle next to + is "Present".

Jordan: "The little triangle. It's a play icon so I figured Play -- it's 'Present'. Fine, same
thing, that's PowerPoint's word too."

## Step 4 -- Present

    timeout 120 node app-b/study.mjs --try $D/06.png task:t30 --click "Save view" --key Enter --click "Present"

Saw: full-screen map, "Present -- Esc to leave" top left, "Lock the canvas" top right, a caption
card at the bottom: "Valjean's circle -- Valjean sits where most of the story's communities meet.
2 of 3", with back and next arrows. Nodes are now colored by group (orange, blue, green, pink,
light blue, black, gray), not the orange PageRank map I saved. No legend on screen.

Jordan: "Nice that it's full screen with a caption -- that's the slide. But it opened on 2 of 3?
Why not the start? And these colors aren't what I was looking at. I saved an orange PageRank map.
And there's no key now -- my manager is going to ask what the pink is. Every time."

## Step 5 -- next and back

    timeout 120 node app-b/study.mjs --try $D/07.png task:t30 --click "Save view" --key Enter --click "Present" --hover "Next"
    timeout 120 node app-b/study.mjs --try $D/08.png task:t30 --click "Save view" --key Enter --click "Present" --key ArrowRight
    timeout 120 node app-b/study.mjs --try $D/09.png task:t30 --click "Save view" --key Enter --click "Present" --key ArrowLeft

Saw: tooltip "Next view (ArrowRight)". Next goes to 3 of 3, "Valjean's neighbors -- The
characters who share at least one chapter with Valjean", with more names labeled and rings around
his neighbors. Back goes to 1 of 3, "Whole cast -- The characters fall into communities of people
who share chapters."

Jordan: "Arrow keys work, like slides. Good, that's how I'd click through with a clicker. But 3 of
3 is 'Valjean's neighbors' -- I never made that. Is that my View 4 with a name it made up? Where's
mine? Three slides, three ticked boxes, so I guess mine is in there... but I can't tell which one
it is. And honestly the three slides look almost the same -- same hairball, same colors, just a
few rings. My VP would think I showed the same slide three times."

## Step 6 -- leave and look for my view

    timeout 120 node app-b/study.mjs --try $D/10.png task:t30 --click "Save view" --key Enter --click "Present" --key Escape

Saw: back in the editor. The list now shows Whole cast, Valjean's circle, From above. View 4 is
gone.

Jordan: "Where's View 4? It's gone. So I saved, presented, and my view disappeared. That's the
'are the numbers the same as the download' feeling all over again. I don't trust it."

## Step 7 -- try to open or rename my view

    timeout 120 node app-b/study.mjs --try $D/11.png task:t30 --click "Save view" --key Enter --click "View 4"
    timeout 120 node app-b/study.mjs --try $D/12.png task:t30 --click "Save view" --key Enter --click "More"

Saw: clicking "View 4" left the list as Whole cast, Valjean's circle (highlighted), From above --
View 4 gone again -- and the right panel switched to "Whole cast, Saved view" with Mode 3D, a
caption, "Keeps: Camera". The map did not change. The "..." menu offers only "Export tour
video...". No Rename.

Jordan: "I click my view and it shows me a different one -- Whole cast -- and highlights a third
one, Valjean's circle. And it says 3D? I don't want 3D anywhere near my VP. The menu has video
export, which, OK, could be handy for a recorded update, but no Rename. I'm stopping."

## Wrap-up

Did I succeed? "Partly. I saved something and I stepped through slides with the arrow keys, that
part was easy. But I couldn't get my title on it, I couldn't tell which slide was mine, the slides
didn't look like what I saved, and after I left the presentation my view was gone. I would not
walk into my manager's office with that."

Single Ease Question: 3 of 7.

Would I use this instead of my current tool? "Not yet. Today I screenshot Gephi into PowerPoint,
type a title on the slide, and add a key by hand. That's clunky but it's mine and it doesn't move.
The Present mode with a caption under the map is genuinely closer to what I want than a
screenshot -- if the title I type sticks, the slide looks like what I saved, and there's a key on
it, I'd try it. Right now it lost my work, so no."

Off-topic: "This is the same thing as the listening suite's 'reports' -- you can save a dashboard
but you can't make it say what you want. And my VP only reads the first slide anyway, which here
opened on slide 2."
