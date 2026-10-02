# Session: keep an angle, title it, step through kept angles (intelligence analyst, Marcus)

Task as given: "You hit on an angle on the drawing that tells the story well. Keep it so you can
come back to it, give it a title, and then step through your kept angles one after another as you
would for your manager."

All commands run from design/ui/prototype. Renders are in
tmp/round-7-sessions/t30--intelligence-analyst/.

## Step 1 -- start screen (shots/tasks/t30/01.png)

"OK, Les Miserables, orange dots, colored by PageRank, sized by degree. Left panel is already on
something called Views and it says 'No saved views. Save view (+)'. Well, that's the button then.
Keeping an angle -- in i2 I'd just save a copy of the chart. Here it's a 'view'. Fine."

## Step 2 -- click Save view

    timeout 120 node app-b/study.mjs --try .../02.png task:t30 --click "Save view"

"Hold on. It said NO saved views a second ago, and now I've got four: 'Whole cast', 'Valjean's
circle', 'From above' and mine, 'View 4'. Where did the other three come from? Somebody else's?
That's the 'side panel said 212, I counted forty' thing. Anyway -- it dropped me straight into the
name box with 'View 4' highlighted. Good, that's where I type the title. There's a column called
'In tour' with checkboxes. Mine's checked already. 'Tour' -- I guess that's the slideshow."

## Step 3 -- type a title

    timeout 120 node app-b/study.mjs --try .../03.png task:t30 --click "Save view" --type "Barricade crew" --key Enter
    timeout 120 node app-b/study.mjs --try .../04.png task:t30 --click "Save view" --type "Barricade crew"

"Typed 'Barricade crew', hit Enter -- it still says 'View 4'. Tried again without Enter: box is
there, highlighted, text didn't take. Either my typing went nowhere or it didn't save. I'll let it
go, the box was clearly meant for the name. I'll call that half done."

(Moderator note in the transcript: the click-through tool does not take typed text, so the title
could not actually be entered; the rename box itself appeared, selected, right after saving.)

## Step 4 -- find the play button

    timeout 120 node app-b/study.mjs --try .../05.png task:t30 --click "Save view" --key Enter --hover "Play"
      -> nothing on screen is called "Play"
    timeout 120 node app-b/study.mjs --try .../06.png task:t30 --click "Save view" --key Enter --hover "Present"

"The little triangle next to the plus. Pointer on it: 'Present'. OK, that's the slideshow."

## Step 5 -- Present

    timeout 120 node app-b/study.mjs --try .../07.png task:t30 --click "Save view" --key Enter --click "Present"

"Full screen, chrome gone, Esc to leave, a caption bar at the bottom. That I like -- that's close
to how I'd put it on the projector. But: it opened on '2 of 3', 'Valjean's circle'. Why not slide
one? And the picture isn't my angle. I saved the orange PageRank chart; this is colored by groups.
Where's my orange chart?"

## Step 6 -- next and previous

    timeout 120 node app-b/study.mjs --try .../08.png task:t30 --click "Save view" --key Enter --click "Present" --hover "Next"
    timeout 120 node app-b/study.mjs --try .../09.png task:t30 --click "Save view" --key Enter --click "Present" --click "Next"
    timeout 120 node app-b/study.mjs --try .../10.png task:t30 --click "Save view" --key Enter --click "Present" --click "Previous"

"Next: '3 of 3, Valjean's neighbors -- characters who share at least one chapter with Valjean'.
More names lit up. Previous from the start: '1 of 3, Whole cast'. So the deck is Whole cast,
Valjean's circle, Valjean's neighbors. 'Valjean's neighbors' was never in my list. And 'View 4',
the one I just kept, is not in it at all even though its box was checked. All three slides are
the same angle on the same drawing, only which names are lit changes. Arrows and the 'x of 3'
counter are fine, I'd figure that out in front of the sergeant."

## Step 7 -- go back to my kept view

    timeout 120 node app-b/study.mjs --try .../11.png task:t30 --click "Save view" --key Enter --click "View 4"

"I click 'View 4' to see what it kept -- and it's gone. List is back to three. 'Valjean's circle'
is highlighted and the right side says 'Whole cast, Saved view, Mode 3D, Keeps: Camera'. I
clicked mine and got two other ones. That's where I stop. I kept an angle, it isn't in the
presentation, and when I go back for it it's not there. If I can't trust it to keep the chart, I
can't brief off it."

## Outcome

- Did I succeed? No. I found how to keep a view and how to present, but my own kept angle never
  showed up in the presentation, it would not take my title, and it vanished when I clicked it.
- Single Ease Question: 3 out of 7. Finding the buttons was easy; trusting the result was not.
- Would I use this instead of what I use now? Not for this. For a brief I'd still paste
  screenshots into PowerPoint, because the slides there are the ones I made. The full-screen
  present mode with a caption and "Esc to leave" is the right idea and better than PowerPoint for
  a live walk-through -- if it showed my angles, in my order, starting at slide one.

## What stood out (participant's words)

- "It said no saved views, then there were three I never made."
- "Present opened on slide 2 of 3. Start at the beginning."
- "The view I saved was the orange one. The deck showed group colors. Which one is my chart?"
- "My view wasn't in the deck, and clicking it made it disappear. Losing my work ends it."
- "Keeps: Camera -- so does it keep the coloring or not? Say what it keeps when I save, not after."
