# Session: attach a reminder to the Valjean-to-Javert chain (screen-reader analyst, Morgan)

Task as given by the moderator: "Your team already worked out the chain of characters linking
Valjean to Javert with as few go-betweens as possible. Leave a reminder attached to that chain as
a whole -- not to either man -- saying it should be checked against the book. You have never
typed your name into this program."

Start screen: shots/tasks/t39/01.png. All renders below are in
tmp/round-7-sessions/t39--screen-reader-analyst/. Every command was run from
design/ui/prototype/ with D set to that folder.

## Step 0 -- start screen (shots/tasks/t39/01.png)

Think-aloud: "Left list. I hear 'Selection', 'Notes 4', 'PageRank', 'Louvain 6 groups', then
'Shortest paths', and under it 'Valjean to Javert, 2' and 'Myriel to Javert, 3'. So the chain my
team found is already a thing with a name. 'Shortest paths' is the word I would have used myself.
The 2 -- I assume that is two members, not two hops. I don't know yet, and nothing says which.
There is also a top-level 'Notes 4'. If I go there I expect a list of notes, and then I'd have to
work out how to point one at the chain. I'd rather go to the chain and look for a note on it."

## Step 1 -- open the chain

    timeout 120 node app-b/study.mjs --try $D/01.png task:t39 --click "Valjean to Javert"

Render 01.png. The right-hand panel now describes the chain: "Valjean to Javert, Path from
Shortest paths", a Summary (Size 2 nodes, 1 edge; From Valjean; To Javert; Edge value 17 shared
chapters), Members in path order (Valjean start, Javert end), Made with (all at their defaults),
and a Notes section: "No notes. Add note (N)".

Think-aloud: "Good: it says 'Path', and it says the members in order with start and end in
words. The summary answers my question about the 2 -- two nodes, one edge. So Valjean and Javert
are directly connected, no go-between at all; fine, that's the team's result, not mine to check.
And at the bottom of this one thing's page: Notes, 'No notes', 'Add note'. That's the place. It is
on the path's page, not on Valjean's or Javert's, so whatever I add here should belong to the
path. 'Add note (N)' -- I'll hear 'Add note left paren N right paren'. I'll put up with it; it
tells me there's a key, which I'll write in my keystroke file."

## Step 2 -- Add note

    timeout 120 node app-b/study.mjs --try $D/02.png task:t39 --click "Valjean to Javert" --click "Add note"

Render 02.png. The left column switched from the graph list to a "Notes" list. At its top is a
new note form: a chip "Valjean to Javert" with a remove button, an empty box "Write a note", a
Save button (grayed) with "Ctrl+Enter", and Cancel. Below it, the four existing notes.

Think-aloud: "Something changed in a different part of the page from where I pressed. The left
side is now Notes. I don't like a panel swapping under me without asking -- the list I came from
is gone and I'll have to find my way back to it. If focus landed in the text box, I'll forgive
it. If focus stayed on 'Add note' over on the right, I'd never know a form opened on the left
unless something told me. I can't tell which from here.

The form starts with 'Valjean to Javert' and a remove button. That is what the note is about.
It's the same name as the path, same orange square as the path row, so I'll take it this is the
chain and not two people. But read aloud, 'Valjean to Javert' and a note tagged 'Valjean' and
'Javert' (the bottom existing note has both men as two separate tags) are close. I would want
the tag to say 'path' -- 'Valjean to Javert, path' -- so I know I'm not attaching to the two men.
I'm going on the fact that I came from the path's page.

Save is grayed out until I write something. Fine. Ctrl+Enter saves. Good, real keys."

## Step 3 -- write the reminder and save

    timeout 120 node app-b/study.mjs --try $D/03.png task:t39 --click "Valjean to Javert" --click "Add note" --type "Check this chain against the book."
    timeout 120 node app-b/study.mjs --try $D/04.png task:t39 --click "Valjean to Javert" --click "Add note" --click "Write a note" --type "Check this chain against the book."
      -> nothing on screen is called "Write a note"
    timeout 120 node app-b/study.mjs --try $D/05.png task:t39 --click "Valjean to Javert" --click "Add note" --key "Control+Enter"
    timeout 120 node app-b/study.mjs --try $D/06.png task:t39 --click "Valjean to Javert" --click "Add note" --click "Save"
      -> nothing on screen is called "Save"

Renders 03-06 all look exactly like 02: the box stays empty and Save stays grayed.

Think-aloud: "I tried to type 'Check this chain against the book.' The text didn't go in --
this click-through can't take typing, so I can't actually put words in the box. Moving to the
box by its placeholder name: 'nothing is called Write a note'. That bothers me more. If the only
label on the box is placeholder text, my screen reader may say 'edit, multi-line, blank' and
nothing else. A text box needs a real name, something like 'Note', that stays after I start
typing. Ctrl+Enter with an empty box did nothing, which is right. And Save is not reachable while
it's disabled -- also normal, but if a disabled button is hidden from the tab order altogether, I
don't learn that Save exists until I've typed. I'd rather hear 'Save, unavailable'.

I'm stopping here. With a real keyboard I'd type the sentence and press Ctrl+Enter. What I'd
check next, and can't: that the note shows up under Notes on the path's own page, that it reads
as attached to the path and not to Valjean and Javert, and that nobody asks me for a name -- I've
never typed one, and nothing on this form asked for one, which is what I want."

## Verdict

- Succeeded? Mostly. I found the chain, found its own Notes section, and opened a note already
  attached to the chain and not to either man. I could not type the text or save it in this
  click-through, so I can't confirm the note was saved or where it ended up.
- Single Ease Question: 5 of 7. Two clicks to the right place, and the path's page said what it
  was in words. Minus points for the left panel swapping to Notes on its own, the note box whose
  only name seems to be placeholder text, and a subject tag that doesn't say "path".
- Would I use this instead of my current tool? For this, possibly. NetworkX has nowhere to hang a
  note on a result; I keep a text file, and it drifts away from the numbers. A note pinned to the
  path that I can find again on that path's page is something my scripts don't give me. I would
  not switch until I've heard the form read out once with NVDA: that the box has a name, that
  focus lands in it, and that after saving I'm told once and can find the note again under the
  path.

## Problems noticed

1. Pressing "Add note" on the path's page (right side) replaced the left-side graph list with
   the Notes list and opened the form there. A panel changed somewhere other than where I acted,
   and the list I came from was gone. Nothing on screen says where focus went.
2. The note box had no name I could reach: "nothing on screen is called Write a note". If its
   only label is placeholder text, a screen reader says "edit, blank" and the name disappears once
   text is typed.
3. The subject tag reads "Valjean to Javert" with no word saying it is a path. Spoken, it sits
   close to a note tagged "Valjean" and "Javert" separately, which is exactly the mistake the task
   warns against.
4. "Add note (N)": the shortcut in parentheses is read aloud every time. Minor.
5. The path row in the list says "2" with no unit; only the path's page explained it as 2 nodes,
   1 edge.
