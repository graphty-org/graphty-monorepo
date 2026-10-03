# Session: keep a named angle and present the kept angles -- Jordan, marketing network analyst

Task as given by the moderator: "The Les Miserables network is open (example data, not your
own). You have turned the drawing to an angle that tells the story well. Keep that exact angle
under a name so you can show it again, then show your kept angles one after another as you would
in a meeting."

Start screen: shots/tasks/r8-t34/01.png. All renders are in
tmp/round-8-sessions/r8-t34--marketing-analyst/. Every command was run from design/ui/prototype
and replays from the start screen. D below stands for that renders folder.

## Steps, thinking aloud

**0. Start screen.** "OK, Les Mis, everything orange by PageRank. 'Keep an angle under a name'
-- in Gephi that's nothing, I screenshot it. Here the left rail has Graph, Data, Views, Notes,
Assistant. 'Views' has a bookmark icon. That's the one."

**1. Open Views.**
`timeout 120 node app-b/study.mjs --try D/01.png task:r8-t34 --click "Views"`
"A list with little thumbnails: Whole cast, Valjean's circle, From above. Each has a checkbox
under a column called 'In tour'. There's a plus and a play triangle at the top. Plus probably
adds the one I'm looking at. 'In tour' is a bit precious, but I'm guessing it means 'in the
slideshow'."

**2. Find out what the plus is called.** I can't hover something called "+", so I guessed names.
`timeout 120 node app-b/study.mjs --try D/02.png task:r8-t34 --click "Views" --hover "+"` --
nothing on screen is called "+".
`... --hover "Save view"` -- tooltip "Save view".
`... --hover "Add view"` and `... --hover "New view"` -- nothing called that.
`timeout 120 node app-b/study.mjs --try D/02.png task:r8-t34 --click "Views" --hover "Save view"`
"Save view. Good, plain English."

**3. Save it.**
`timeout 120 node app-b/study.mjs --try D/03.png task:r8-t34 --click "Views" --click "Save view"`
"It added 'View 4' with the name already highlighted so I can type over it, and ticked it into
the tour. That's how PowerPoint does a new slide. Fine."

**4. Name it.**
`timeout 120 node app-b/study.mjs --try D/04.png task:r8-t34 --click "Views" --click "Save view" --type "Bridges to the barricade" --key Enter`
"Saved as 'Bridges to the barricade'. But what did it actually keep? Only the camera, or also
the PageRank coloring and the labels? Nothing says. If I change the coloring later and this
slide changes with it, that's a nasty surprise in the meeting."

**5. Find out what the triangle is called.**
`... --hover "Play tour"` -- nothing called that. `... --hover "Present"` -- tooltip "Present".
`... --hover "Play"` -- nothing called that.
"Present. That's the right word, it's what I'm doing."

**6. Present.**
`timeout 120 node app-b/study.mjs --try D/05.png task:r8-t34 --click "Views" --click "Save view" --type "Bridges to the barricade" --key Enter --click "Present"`
"Full screen, panels gone, the color key stays at the top left, 'Esc to leave'. A caption bar at
the bottom says 'Whole cast, 1 of 3'. Three is right: two were ticked plus mine, and From above
isn't ticked. Nice. But the caption says 'the characters fall into communities' and everything on
screen is one shade of orange. Where are the communities? My VP would ask what she's meant to be
looking at."

**7. Step through.**
`timeout 120 node app-b/study.mjs --try D/06.png task:r8-t34 <steps from 6> --click Next`
`timeout 120 node app-b/study.mjs --try D/07.png task:r8-t34 <steps from 6> --click Next --click Next`
"Slide 2, Valjean's circle, zooms in. Works. But the caption bar sits on top of Bossuet and
Courfeyrac -- 'ourfeyrac' is cut off. Those are labels I'd want people to read. Slide 3 is mine,
'Bridges to the barricade, 3 of 3', and the next arrow goes gray, so it's the end. But it looks
exactly like slide 1. Pixel for pixel, as far as I can tell. Either my angle happened to be the
same as 'Whole cast', or it saved something else. I can't tell which, and two identical slides
in a deck looks like I messed up. Also mine has no caption line under the title, the others do,
and I never saw a place to write one."

**8. Leave.**
`timeout 120 node app-b/study.mjs --try D/08.png task:r8-t34 <steps from 6> --click Next --click Next --key Escape`
"Escape drops me back where I was, my view is still in the list. Done."

Off-topic: "Honestly the meeting version is what I need more than any of the algorithm stuff. My
VP reads slide one and stops. If this could just BE the deck I'd skip the screenshot-into-
PowerPoint step that eats my Thursday afternoons. Brandwatch's 'reports' won't let me do even
that much."

## Result

- Succeeded? Yes, I think so. I saved the angle under my own name and played the kept views in
  order, mine included. I'm not 100% sure it saved my exact angle, because my slide looks
  identical to the first one.
- Single Ease Question: 6 of 7. Save view and Present were where I'd look and used my words. I
  lost a point because I couldn't tell what a view keeps and couldn't confirm my angle stuck.
- Would I use this instead of my current tool? For this part, probably yes. Today it's Gephi
  screenshots pasted into PowerPoint, and the color key falls off. Here the key comes along and
  it's live. I'd still want (a) to know whether a view freezes the coloring or follows it, (b) a
  place to write the one-line caption the sample slides have, and (c) the caption bar to stay off
  the labels. Without (b) I'm back in PowerPoint writing captions anyway.

## Problems seen

1. Nothing says what a saved view holds: only the camera, or also the coloring, labels and
   filter. (Severity: medium. It decides whether the deck changes under you.)
2. My saved view looked identical to "Whole cast", and there was no sign that this specific
   angle was captured, such as a thumbnail I could compare. (Medium.)
3. I found no way to add the one-line caption that the existing views show while presenting.
   (Medium.)
4. On a zoomed slide the caption bar covers node labels near the bottom: "Courfeyrac" is cut
   off and "Bossuet" is hidden. (Low to medium.)
5. The "Whole cast" caption talks about communities, but the slide is colored by PageRank, so
   there are no communities to see. A caption and coloring that disagree make a presenter look
   careless. (Low. It's example content, but it shows that a caption can drift from its view.)
6. The column label "In tour" is a little opaque. I guessed it meant "in the slideshow". (Low.)

## What worked

- "Save view" puts the name straight into edit mode and ticks the view into the tour: one click,
  then type.
- "Present" is the word I would use. Full screen with the color key kept, "N of M", arrows and
  Esc to leave.
- Unticked views are skipped while presenting, so I can keep spare angles without showing them.
