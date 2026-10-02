# Session: leave a reminder on the Ana Ruiz to Priya Nair chain -- supply chain analyst (Dana Okafor)

Task as given: "Someone already worked out how Ana Ruiz and Priya Nair could have met through a
building they both use, as a chain from one to the other. Leave a reminder on that chain as a
whole -- not on either person or the building -- saying it needs checking against the badge logs."

Start screen: shots/tasks/t39-doorentries/01.png. Renders: tmp/round-7-sessions/t39-doorentries--supply-chain-analyst/.
All commands run from design/ui/prototype; D=tmp/round-7-sessions/t39-doorentries--supply-chain-analyst.

## 01 -- start screen

Dana: "Big gray hairball, two orange lines on the right. Top-left legend says 'Color: Shortest
paths -- Ana Ruiz to Priya Nair'. And the left list has the same thing under 'Shortest paths':
'Ana Ruiz to Pr...', cut off, but it's obviously that one. That's the chain. Click it."

## 02 -- clicked the chain row

    timeout 120 node app-b/study.mjs --try $PWD/$D/02.png task:t39-doorentries --click "Ana Ruiz to Priya Nair"

Dana: "Right side now says 'Ana Ruiz to Priya Nair -- Path'. From Ana Ruiz, To Priya Nair, Via B1.
Members in order: Ana, B1, Priya. Good, it's a little table, I can read that. At the bottom,
'Notes -- No notes. Add note'. That's where it goes."

## 03 -- Add note

    timeout 120 node app-b/study.mjs --try $PWD/$D/03.png task:t39-doorentries --click "Ana Ruiz to Priya Nair" --click "Add note"

Dana: "The left side flipped to a Notes list, with a box tagged 'Ana Ruiz to Priya Nair'. That's
the chain, not Ana and not B1 -- the other notes below are tagged 'Ana Ruiz . person' and 'B1 .
building', so I can tell the difference. But hang on, the orange lines disappeared from the
picture, and the label now says 'Nothing is colored or sized by a row'. Did I just switch off
the path? The right panel still shows it, so I'll carry on, but that made me nervous."

## 04, 05 -- trying to type

    timeout 120 node app-b/study.mjs --try $PWD/$D/04.png task:t39-doorentries --click "Ana Ruiz to Priya Nair" --click "Add note" --type "Needs checking against the badge logs" --click "Save"
    -> nothing on screen is called "Save"
    timeout 120 node app-b/study.mjs --try $PWD/$D/05.png task:t39-doorentries --click "Ana Ruiz to Priya Nair" --click "Add note" --click "Write a note" --type "Needs checking against the badge logs"
    -> nothing on screen is called "Write a note"

(Study tool: --type is not a supported step and was silently ignored; the empty box kept Save
disabled. Not a fault of the screen itself.)

## 06 -- typing with keys

    timeout 120 node app-b/study.mjs --try $PWD/$D/06.png task:t39-doorentries --click "Ana Ruiz to Priya Nair" --click "Add note" --key N --key e --key e --key d --key s

Dana: "There we go, 'Needs' in the box and Save turned blue. The cursor was already in the box
when it opened -- good, I didn't have to click it."

## 07 -- full note, Save

    timeout 180 node app-b/study.mjs --try $PWD/$D/07.png task:t39-doorentries --click "Ana Ruiz to Priya Nair" --click "Add note" --key C --key h --key e --key c --key k --key Space --key a --key g --key a --key i --key n --key s --key t --key Space --key b --key a --key d --key g --key e --key Space --key l --key o --key g --key s --click "Save"

Dana: "Top of the notes list: 'Check against badge logs', tagged 'Ana Ruiz to Priya Nair', 'Just
now'. Right panel under Notes now says '1 note'. Done."

## Wrap-up

- Succeeded? Yes. The note is on the chain itself; the tag says the chain's name and it sits
  apart from the person and building notes.
- Single Ease Question: 6 of 7. Three clicks and type. Lost a point because the orange lines
  vanished from the picture when I opened the note box ("Nothing is colored or sized by a row")
  and nothing told me why -- for a second I thought I'd undone the chain.
- Would I use this instead of my current tool? "For notes like this, on a chain, yes, it beats
  a comment cell in Excel that floats loose from what it's about. But my real question is still
  whether my notes go anywhere off my laptop and whether I can get them out into Power BI or a
  spreadsheet for the Thursday meeting. 'Local only' at the top is a good sign for IT. I didn't
  see an export for notes."

## Observations for the designers

1. Opening a note on the path cleared the path highlight on the canvas and switched the legend
   to "Nothing is colored or sized by a row" (renders 03, 07). The thing being annotated
   disappeared from view while annotating it. Severity: medium.
2. The left list cuts the chain name to "Ana Ruiz to Pr..." (01). Fine here with one path; with
   several paths between people with similar names it would be ambiguous. Severity: low.
3. The note's tag "Ana Ruiz to Priya Nair" has no type word, unlike "Ana Ruiz . person" and
   "B1 . building" next to it, so "this is a chain" is only implied by the orange dot. Severity: low.
4. Positive: "Add note" sits right on the chain's own details, the box opens with the cursor in
   it and already tagged, and the right panel updates to "1 note".
