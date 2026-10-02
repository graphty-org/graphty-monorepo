# Session: keep a view, title it, step through kept views (Explorer Elena)

Task as given: "You hit on an angle on the drawing that tells the story well. Keep it so you can
come back to it, give it a title, and then step through your kept angles one after another as you
would for your manager. The data on screen is a sample: characters of the novel Les Miserables,
linked when they appear in the same chapter. If that is not your line of work, treat them as your
own people or things."

Start screen: shots/tasks/t30/01.png. All renders below are in
tmp/round-7-sessions/t30--explorer-elena/. Every command was run from
design/ui/prototype; D stands for that render folder, and K stands for the nine key presses
`--key B --key a --key r --key r --key i --key c --key a --key d --key e` (the tool types one key
at a time).

## Think-aloud

**Start (01.png from shots/tasks/t30).** OK, so I'm already on something called "Views" on the
left, and it says "No saved views. Save view". Well, that's handy, that's literally the thing.
I like this picture fine -- the dark one in the middle is Valjean, he's the main guy, obviously
the biggest one so he's the most important. I'll just keep what's on screen.

**Step 1.**
`timeout 120 node app-b/study.mjs --try D/01.png task:t30 --click "Save view"`

Oh. Wait. Now there are four things in the list -- "Whole cast", "Valjean's circle", "From
above", and mine, "View 4", with the name highlighted so I can type. Where did the other three
come from? A second ago it said I had no saved views. Maybe someone else's? Whatever. It wants a
name, good, I'll type one. There's a column "In tour" with checkboxes, mine is ticked.

**Step 2.**
`timeout 120 node app-b/study.mjs --try D/02.png task:t30 --click "Save view" --type "Valjean and the barricade" --key Enter`

(The study tool has no --type; the name stayed "View 4". This is a tool limit, not the app; I
retried by typing key by key.)

**Step 3.**
`timeout 120 node app-b/study.mjs --try D/03.png task:t30 --click "Save view" --key B --key a --key r --key r`

OK, it's typing. "Barr".

**Step 4.**
`timeout 120 node app-b/study.mjs --try D/04.png task:t30 --click "Save view" K --key Enter`

"Barricade". It's saved, it's in the list with a little picture, ticked. Good. That part was
easy, honestly, easier than our dashboard where you have to find "Save as" in a menu.

Now "step through them like for my manager". There's a little triangle next to the plus at the
top of the list. Play, I guess.

**Step 5.**
`timeout 120 node app-b/study.mjs --try D/05.png task:t30 --click "Save view" K --key Enter --hover "Play"`
-> "nothing on screen is called Play"

**Step 6.** Guessing what it is called.
`for n in "Present" "Start tour" "Play tour"; do timeout 120 node app-b/study.mjs --try D/06.png task:t30 --click "Save view" K --key Enter --hover "$n"; done`
-> "Present" found; "Start tour" and "Play tour" not. Re-rendered:
`timeout 120 node app-b/study.mjs --try D/06.png task:t30 --click "Save view" K --key Enter --hover "Present"`

Tooltip says "Present". Like Slides. Fine.

**Step 7.**
`timeout 120 node app-b/study.mjs --try D/07.png task:t30 --click "Save view" K --key Enter --click "Present"`

Ooh, full screen, and everything's colorful now -- groups in different colors, bigger names.
That's nice, that's something I would actually show. Bottom bar says "Valjean's circle --
Valjean sits where most of the story's communities meet." and "2 of 3".

Hm. 2 of 3? Why am I starting on the second one? And it's not mine. Also the colors aren't what
I saved -- I saved the orange one.

**Step 8.**
`timeout 120 node app-b/study.mjs --try D/08.png task:t30 --click "Save view" K --key Enter --click "Present" --hover "Next"`

Arrow says "Next view", and the right-arrow key works. Good.

**Step 9.**
`timeout 120 node app-b/study.mjs --try D/09.png task:t30 --click "Save view" K --key Enter --click "Present" --click "Next"`

"3 of 3, Valjean's neighbors." That one wasn't even in my list. And it looks... the same as the
last one, more names, same zoom. Where's Barricade?

**Step 10.**
`timeout 120 node app-b/study.mjs --try D/10.png task:t30 --click "Save view" K --key Enter --click "Present" --click "Next" --click "Next"`
-> "nothing on screen is called Next" (it's the last one, the arrow is greyed out). So that's the
end.

**Step 11.**
`timeout 120 node app-b/study.mjs --try D/11.png task:t30 --click "Save view" K --key Enter --click "Present" --key ArrowLeft`

Going back: "1 of 3, Whole cast." So the slides are Whole cast, Valjean's circle, Valjean's
neighbors. Mine isn't in there. All three look pretty much the same picture to me, honestly --
same angle, just a ring around a different dot. I thought "angle" meant the camera.

I probably did something wrong. Maybe I have to pick mine first. Let me go out and click it.

**Step 12.**
`timeout 120 node app-b/study.mjs --try D/12.png task:t30 --click "Save view" K --key Enter --click "Present" --key Escape --click "Barricade"`
-> "nothing on screen is called Barricade"

...It's gone. The list is back to Whole cast, Valjean's circle, From above. My Barricade one
disappeared when I came out of the presentation. Did it not save? I pressed Enter. It was right
there with a picture.

**Step 13.**
`timeout 120 node app-b/study.mjs --try D/13.png task:t30 --click "Save view" K --key Enter --click "Present" --key Escape --click "Barricade" --click "Present"`
-> same, "nothing on screen is called Barricade".

**Step 14.** One more go: save it, click it, then present.
`timeout 120 node app-b/study.mjs --try D/14.png task:t30 --click "Save view" K --key Enter --click "Barricade" --click "Present"`

"2 of 3, Valjean's circle." Again. Not mine.

Yeah. OK. I'm not going to do that in front of my manager.

## Outcome

- Did I succeed? No. Keeping a view and naming it worked. Stepping through my kept views did not
  include the one I kept, it started on the second slide, it showed a slide ("Valjean's
  neighbors") that was never in my list, and after leaving the presentation my saved view was
  gone from the list.
- Single Ease Question: 2 of 7. The save was a 6; the "show it to my manager" part was a 1, and
  that's the part that matters.
- Would I use this instead of my current tool? Not for this. Saving a view was quicker than in
  Slides, and the full-screen presenting look is nicer than a screenshot in a deck. But if the
  thing I saved isn't in the slideshow, and then disappears, I'd just screenshot it into Google
  Slides like I do now. I can't take something to my manager that might lose my slide.

## Observations for the study team (from the session record, not Elena's voice)

1. The saved view is lost on leaving Present: after Save view, title, Enter, Present, Escape, the
   list no longer holds the new view (12.png vs 04.png).
2. Present ignores the newly saved and ticked view: the run is Whole cast, Valjean's circle,
   Valjean's neighbors (07, 09, 11, 14.png), although the list shows Whole cast, Valjean's
   circle, From above (unticked), Barricade (ticked).
3. "Valjean's neighbors" is presented but never appears in the Views list.
4. Present opens on "2 of 3", not on the first view, whatever row is selected (07, 14.png).
5. The empty state "No saved views" is contradicted the moment one is saved: three other views
   appear at the same time (start screen vs 01.png).
6. The presented colors (communities) differ from the colors on screen when the view was saved
   (PageRank orange), so the participant did not recognize the slide as "her" angle.
7. The three presented slides share one camera; only the ring and the labels change, which reads
   as "the same picture" to a non-specialist told to keep an "angle".
8. The triangle's tooltip is "Present"; she guessed "Play" first. Minor.
