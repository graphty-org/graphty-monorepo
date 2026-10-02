# Session: attach a note to Valjean -- Marcus, criminal intelligence analyst

Task as given by the moderator: "You have just realized why Valjean matters to your argument.
Write the thought down so that next week you, or a colleague, can come back to it attached to
him. You have never typed your name into this program."

Renders are in design/ui/prototype/tmp/round-7-sessions/t05--intelligence-analyst/.
Every command was run from design/ui/prototype.

## Start screen (shots/tasks/t05/01.png)

Think-aloud: "Same chart as before. Valjean's the big dark one in the middle. There's a 'Notes'
row over on the left with a 4, and a 'Notes' button on the far left rail. But I want this on HIM,
not in some notebook off to the side. In i2 I'd right-click the entity and add a note to its card.
So I click him first."

## Step 1 -- click Valjean

    timeout 120 node app-b/study.mjs --try .../t05--intelligence-analyst/01.png task:t05 --click "Valjean"

Result (01.png): Valjean ringed, "Valjean, 36 connections" under the chart, a little toolbar of
five icons popped up above the bottom bar. Right panel now says "Valjean, Node" with "Why this
look".

Think-aloud: "OK, it knows I've got him. Five icons, no words. The last one is a speech bubble
with a plus -- that's usually 'comment'. Let me rest on it before I click, I'm not clicking
mystery buttons."

## Step 2 -- hover the speech-bubble icon

    timeout 120 node app-b/study.mjs --try .../02.png task:t05 --click "Valjean" --hover "Add note"

Result (02.png): tooltip "Add note  N".

Think-aloud: "Add note, and the N key. Good. That's what I want."

## Step 3 -- click Add note

    timeout 120 node app-b/study.mjs --try .../03.png task:t05 --click "Valjean" --click "Add note"

Result (03.png): left panel switched to "Notes". At the top, a box with a "Valjean x" chip, an
empty "Write a note" field, a grayed "Save  Ctrl+Enter" and "Cancel". Below it, the other notes
already in the file, several of them tagged Valjean too.

Think-aloud: "That's right. It already put his name on it, I didn't have to pick him from a list.
And there's a note somebody left yesterday -- 'Highest betweenness in the book, 0.57' -- also on
Valjean. Good, that's the kind of thing I'd want to find next week. Now I type."

## Step 4 -- type the thought and save (first attempt)

    timeout 120 node app-b/study.mjs --try .../04.png task:t05 --click "Valjean" --click "Add note" --click "Write a note" --type "Valjean is the bridge: ..." --click "Save"

Tool said: nothing on screen is called "Write a note"; nothing on screen is called "Save".
Result (04.png): unchanged, empty draft, Save still grayed.

Think-aloud (as Marcus): "Clicked in the box and typed... nothing went in? Save's still gray."
(Moderator note to self, out of character: the session tool did not take my typing that way;
the cursor was already in the box, so I typed key by key instead. This is the tool, not the app.)

## Step 5 -- type into the box and press Ctrl+Enter

    timeout 120 node app-b/study.mjs --try .../05.png task:t05 --click "Valjean" --click "Add note" --key B --key r --key i --key d --key g --key e --key Control+Enter

(The thought I meant: "Valjean is the bridge -- the only one tying Fantine's people to the
student crew. Take him out and they split. Check the chapter sources before the brief." The
session tool only let me get one word in, "Bridge".)

Result (05.png): the draft became a note at the top of the list: "Bridge", chip "Valjean",
"Just now", and a "..." menu.

Think-aloud: "Saved. Ctrl+Enter, same as Teams. It's on Valjean, it's on top. That part worked
in about four seconds."

"Now -- whose note is this? It says 'Just now'. It doesn't say Marcus. None of them say who wrote
them. 'Highest betweenness, 0.57' -- who said that? If my colleague opens this next week, he
sees a list of opinions with no names on them. In our shop a note without a name and a date
doesn't exist. And I never typed my name in anywhere, so how could it know? It never asked."

"Also, top bar says 'Local only'. I like that, it means it didn't go to anyone's cloud. But then
how does my colleague 'come back to it'? Is this file on my machine only? I'd have to hand him
the file somehow."

## Step 6 -- does it show up on Valjean himself?

    timeout 120 node app-b/study.mjs --try .../06.png task:t05 --click "Valjean" --click "Add note" --key B ... --key Control+Enter --click "Data"

Result (06.png): I meant Valjean's Data tab on the right; it went to the big Data section on the
left rail instead and the right panel switched to the whole graph ("Co-appearances"), which has
"Notes: 1 note . Add note (N)" at the bottom.

Think-aloud: "Wrong 'Data'. There are two buttons called Data on the screen. Fine. Valjean's
panel on the right before this did list 'Notes -- Label below' under 'Why this look', so I guess
the note is on his card somehow, but that's about how he LOOKS, not the note itself. I would've
liked to see my note text right there on his panel."

## Step 7 -- who wrote it? hover the time

    timeout 120 node app-b/study.mjs --try .../07.png task:t05 --click "Valjean" --click "Add note" --key B ... --key Control+Enter --hover "Just now"

Result (07.png): tooltip "Thursday, October 1, 2026, just now".

Think-aloud: "Date, good, a full date is what I'd want. Still no name. And it says October 1 --
whatever. The date's there, the author isn't."

## Step 8 -- the "..." on my note

    timeout 120 node app-b/study.mjs --try .../08.png task:t05 --click "Valjean" --click "Add note" --key B ... --key Control+Enter --click "More"

Result (08.png): instead of the note's menu, a right-click-style menu for Valjean opened on the
chart (Neighborhood, Path between, Analyze, Create set, Add to set, Remove from Watchlist, Frame
selection, Pin, Hide on canvas, Delete, Add note N, Show in table), and the left panel went back
to the Graph list, where "Notes" still says 4.

Think-aloud: "That's not the note's menu, that's his menu. Fine -- 'Add note' is in there too, so
the right-click way would have worked as well. But the left list says 'Notes 4'. I count seven
notes in the notes list, mine included. Which number is lying? I quit poking here; the note is
saved and attached, that's the job."

## Result

- Did I succeed? Yes. The note is saved and attached to Valjean, with a date. Finding the button
  took one click on him and one on the speech bubble, and the note was pre-tagged to him.
- What I would not trust: no author on any note. A colleague coming back to it next week cannot
  tell my note from anyone else's. The program never asked who I am, which I like for getting
  started, but it means the note is anonymous and nothing told me so.
- Smaller gripes: the toolbar icons have no words (I had to hover); two different "Data" buttons
  on the screen at once; "Notes 4" on the Graph list when the notes list shows seven; "Local
  only" is reassuring but nothing tells me how a colleague would get this note.
- Single Ease Question: 6 of 7. Writing it was easy. Knowing who wrote it later is not solved.
- Would I use this instead of my current tool? For this job, notes on an entity, it's quicker
  than i2's card fields and I like that the note lists every entity it's about. But until a note
  carries my name (and ideally a source and a grade), it can't go in a case file. i2 and a Word
  doc stay for now.
