# Session: leave a note on a whole chain (door entries) -- Priya, threat hunter

Task as given: "Someone already worked out how Ana Ruiz and Priya Nair could have met through a
building they both use, as a chain from one to the other. Leave a reminder on that chain as a
whole -- not on either person or the building -- saying it needs checking against the badge logs."

Renders are in tmp/round-7-sessions/t39-doorentries--cybersecurity-analyst/ (01 is the start
screen, shots/tasks/t39-doorentries/01.png). Every command ran from design/ui/prototype with
D=tmp/round-7-sessions/t39-doorentries--cybersecurity-analyst.

## Start screen (01)

"Is this approved? Where does it run? Does it phone home? There's a 'Local only' chip in the top
bar, which is the first time a tool answered that before I asked. I'd still want to verify it,
but fine. Door entries, March 2026. 421 nodes, 412 people, 9 buildings. There's an orange two-hop
thing on the right, and the legend says 'Ana Ruiz to Priya Nair'. In the left list: Shortest
paths, then 'Ana Ruiz to Pr...' under it. That's the chain somebody already ran. Click it."

## Step 1 (02)

    node app-b/study.mjs --try $D/02.png task:t39-doorentries --click "Ana Ruiz to Pr"

"Right panel header: 'Ana Ruiz to Priya Nair, Path from Shortest paths'. From Ana Ruiz, To Priya
Nair, Via B1. Members in path order: Ana start, B1 hop 1, Priya end. Good, that's the hops in
order -- that's what I want from a path. At the bottom: 'Notes. No notes. Add note (N)'. This
panel is about the path, not a person, so a note here should hang on the path. Click Add note."

## Step 2 (03)

    node app-b/study.mjs --try $D/03.png task:t39-doorentries --click "Ana Ruiz to Pr" --click "Add note"

"Left side flipped to a Notes list. Composer at the top, already tagged with a chip 'Ana Ruiz to
Priya Nair' with the orange dot. Not tagged with Ana, not B1. Good. Below are three older notes --
one on Ana Ruiz as a person, one on B1 as a building, one on the Ana -> B1 entries edge. So the
app clearly can tell those apart.

But the orange highlight on the graph is gone, and the overlay now says 'Nothing is colored or
sized by a row'. Why did opening a note box switch off my path? I was looking at it."

## Step 3 -- trying to type (04, 05, 06)

    node app-b/study.mjs --try $D/04.png task:t39-doorentries --click "Ana Ruiz to Pr" --click "Add note" --type "Needs checking against the badge logs" --click "Save"
    -> nothing on screen is called "Save"
    node app-b/study.mjs --try $D/05.png task:t39-doorentries --click "Ana Ruiz to Pr" --click "Add note" --click "Write a note" --type "Needs checking against the badge logs"
    -> nothing on screen is called "Write a note"
    node app-b/study.mjs --try $D/06.png task:t39-doorentries --click "Ana Ruiz to Pr" --click "Add note" --key N --key e --key e --key d --key s

"(These first two failures were the study harness not taking my text, not the app. Moderator
note: --type is not a step the click-through tool accepts.) Box empty, Save grayed out. Just
typed -- cursor was already in the box, 'Needs' appeared and Save went blue. Fine, focus lands in
the text box. That's how it should be."

## Step 4 -- write and save (07)

    T="Check against badge logs"; for each character: --key <char> (Space for spaces)
    node app-b/study.mjs --try $D/07.png task:t39-doorentries --click "Ana Ruiz to Pr" --click "Add note" <keys> --click "Save"

"Note at the top of the list: 'Check against badge logs', chip 'Ana Ruiz to Priya Nair', 'Just
now'. Right panel for the path now says '1 note . Add note'. That's on the chain. Done.

Two gripes. One: the path chip on my note doesn't say what it is. The others say 'Ana Ruiz .
person', 'B1 . building', even the edge has an arrow icon. Mine just has an orange dot. In six
months I won't know that dot means 'a saved path' and not 'something colored orange'. Two: my
highlight is still gone. The legend said 'Shortest paths' when I came in and now says nothing is
colored. Did my note break the coloring? I'd go check, which is time I don't have."

## Verdict

- Succeeded: yes. The note is on the path itself, and the path's panel counts it.
- Single Ease Question: 6 of 7. Three clicks and typing. Lost a point for the highlight vanishing
  when the notes panel opened -- it made me doubt what I'd just done.
- Would I use this instead of my current tool? For this, maybe. Today I'd write "check
  Ana->B1->Priya against badge logs" in my notebook or the case notes, and it would be a line of
  text with no link to anything. Here the note is attached to the saved path, which is better --
  if I can get the note list out with the path members as rows. I didn't see an export on notes.
  And I still want the badge times on each hop; "via B1" doesn't tell me they were in the
  building at the same time, which is the whole point of the check.
