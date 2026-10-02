# Session: write a note attached to Valjean -- played by the recipe recipient (Tom, lab manager)

Task as given: "You have just realized why Valjean matters to your argument. Write the thought
down so that next week you, or a colleague, can come back to it attached to him. You have never
typed your name into this program. The data on screen is a sample: characters of the novel Les
Miserables, linked when they appear in the same chapter."

Start screen: shots/tasks/t05/01.png. Renders: tmp/round-7-sessions/t05--recipe-recipient/01.png
to 08.png. All commands were run from design/ui/prototype; D below stands for
/home/apowers/Projects/graphty-monorepo/.worktrees/ux-storyboards-mocks-and-study/design/ui/prototype/tmp/round-7-sessions/t05--recipe-recipient

## Step 0 -- the start screen

"Lots of orange dots. Valjean is the big dark one in the middle, his name is on it. On the left
there's a list -- Selection, Notes 4, PageRank, Louvain, I don't know what most of those are.
There's a 'Notes' on the far left too. I want the note on HIM, so I'll click him first, like
clicking a cell in Excel before you add a comment."

## Step 1 -- click Valjean (01.png)

    timeout 120 node app-b/study.mjs --try $D/01.png task:t05 --click "Valjean"

"OK, he's got a ring around him now and the right side says 'Valjean, Node'. A little bar came
up under the picture with five icons and 'Valjean, 36 connections'. No words on the icons. The
last one looks like a speech bubble with a plus. That's the closest thing to 'comment'."

## Step 2 -- rest the pointer on the speech-bubble icon (02.png)

    timeout 120 node app-b/study.mjs --try $D/02.png task:t05 --click "Valjean" --hover "Add note"

"'Add note', with an N. Good, that's what I want." (Moderator note: Tom normally does not wait
for tooltips; here the bubble-with-plus was the only icon that looked like writing, so he would
probably have just clicked it.)

## Step 3 -- click Add note (03.png)

    timeout 120 node app-b/study.mjs --try $D/03.png task:t05 --click "Valjean" --click "Add note"

"The left side turned into 'Notes'. There's a box at the top with a little 'Valjean' tag already
in it and 'Write a note'. Below it other people's notes -- 'Highest betweenness in the book',
'Javert follows Valjean...'. So it already knows it's for Valjean. That's what I wanted."

## Step 4 -- try to click into the box (04.png)

    timeout 120 node app-b/study.mjs --try $D/04.png task:t05 --click "Valjean" --click "Add note" --click "Write a note" --type "Valjean is the bridge: ..."

Tool said: nothing on screen is called "Write a note". (The --type step is not something the
study tool supports.) Nothing changed on screen.
"I clicked in the box... nothing typed. Maybe I have to just type."

## Step 5 -- type without clicking (05.png)

    timeout 120 node app-b/study.mjs --try $D/05.png task:t05 --click "Valjean" --click "Add note" --type "Valjean is the bridge: ..."

Nothing typed (study tool limitation, not the app). Moderator note: typing is only possible key
by key in the study tool; steps 6 and 7 do that. Not counted against the app.

## Step 6 -- type one word, key by key (06.png)

    timeout 120 node app-b/study.mjs --try $D/06.png task:t05 --click "Valjean" --click "Add note" --key B --key r --key i --key d --key g --key e

"'Bridge' is in the box and the Save button went blue. The cursor was already in the box, so I
didn't have to click it. Fine."

## Step 7 -- write the thought and save (07.png)

    timeout 180 node app-b/study.mjs --try $D/07.png task:t05 --click "Valjean" --click "Add note" <one --key per character of "Bridge between Myriel and the students", Space for spaces> --click "Save"

"Saved. It's at the top of the list: 'Bridge between Myriel and the students', the Valjean tag,
'Just now'. Good.
But: it doesn't say who wrote it. The others don't either. If my colleague opens this next week
there are seven notes and none has a name on it. Is that mine or the postdoc's? I'd have to
remember my wording.
And the picture didn't change. I don't see anything on Valjean in the picture saying he has a
note. On the right it says 'Notes -- Label below' under 'Why this look', but I don't see a label
below him. Maybe that's for something else."

## Step 8 -- check where it is kept (08.png)

    timeout 180 node app-b/study.mjs --try $D/08.png task:t05 --click "Valjean" --click "Add note" <same keys> --click "Save" --click "Local only"

"'Local only' at the top -- I want to know if that means the note stays on my laptop. It opened
a big Settings box, Privacy. 'Where your data goes: Files you open -- read on this computer,
never uploaded. Your project -- saved where you save it.' OK, so nothing left the building. I
like that it says it plainly; I could forward that to IT.
But 'saved where you save it' -- I never saved anything. I pressed Save on the note. Is the
note in the file now, or only in this browser until I do something else? Nothing told me the
file has unsaved changes. If I close this, is it gone next week? That's exactly what happened
to us with Gephi.
Also behind the box, the list on the left went back to the graph list and it still says
'Notes 4'. I just added one. The notes list had more than four in it anyway. So what's the 4?
I'd count, and it doesn't match."

I stop here. I'd close the box and ask the postdoc whether I need to save the file.

## Outcome

- Did I succeed? "Partly. I wrote the note and it's on Valjean -- the tag says so. I'm not sure
  it will still be there next week, and my colleague won't know it was me."
- Single Ease Question: 5 of 7. Getting the note box on Valjean was easy (select him, the
  speech bubble). What cost the points: no name on the note, no sign it is kept beyond this
  sitting, and a count that did not go up.
- Would I use this instead of my current tool? "For this, my current tool is a comment in the
  Excel sheet or an email to the postdoc. This was about as quick as an Excel comment, and the
  'never uploaded' statement is better than anything Excel tells me. But Excel shows my name on
  the comment and I know Ctrl+S keeps it. Until I know the note survives closing the window and
  says who wrote it, I'd still email her."

## Problems observed

1. No author on the note. The task said the colleague must come back to it; the saved note shows
   text, the Valjean tag and "Just now", but no name, and the program never asked for one.
   Severity: high for the colleague half of the task.
2. Unclear persistence. After Save, nothing says whether the note is in the project file or only
   in this browser; the Privacy page says "Your project: saved where you save it", which reads as
   "you still have to save". No unsaved-changes marker on the title. Severity: high for this
   persona (lost-work history).
3. The left-panel "Notes" row read 4 at the start and still 4 after adding a note, while the Notes
   list held seven or more notes. Severity: medium -- a count that does not match erodes trust.
4. No visible mark on Valjean in the picture after the note was saved, although the right panel
   lists "Notes -- Label below" for him. Severity: low to medium.
5. The "Add note" control is an icon only; its name appears only on hover. It was findable
   because a speech bubble with a plus is a common comment icon. Severity: low.

## What went well

- Selecting Valjean first, then "Add note", opened a note already tagged with Valjean -- no
  picking him from a list.
- The cursor was already in the text box; Save lit up as soon as there was text.
- The new note went to the top of the list with the Valjean tag and "Just now".
- "Local only" led to a plain-language "Where your data goes" statement Tom could forward to IT.
