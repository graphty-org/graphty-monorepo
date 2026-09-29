# Session: my name on my notes -- Sarah, level-2 fraud investigator

Participant: Sarah (persona: study/personas/fraud-analyst.md), eight years in financial crime,
works escalated cases and writes the SARs. Mode: not mandated -- her own patience, one task. She
finished it, but only after looking in three wrong places first.

Task as given by the moderator: "A colleague opens this project next week and will read your notes
beside her own. Make sure she can tell which ones are yours."

Screens seen, in order (study view, 1440 x 900, design notes hidden): take a note (states 1 to 5:
the set's menu, writing, the added note, the notes list next session), the notes panel (states 3,
4, 5 and 9: a project with two authors, a row's menu, find, view only), Preferences (state 1, the
menu, and state 2, the name dialog), and the Export dialog's evidence file (state 6). Renders are
in tmp/sarah-names/. HTML read only to see what the note's "..." and the notes list's filter
button would do when clicked.

## Think-aloud

**Where my notes are (take a note, 1 to 3).** "OK, so this is my mule ring from March, 14
accounts, and I already wrote my note on it -- 'Referred for a SAR... ACC-753261 ranks highest,
likely the collector.' Let me look at the note. It says 'About Mule ring, 14 accounts', then 'Sep 28
2026, 10:42', then my text. Date, yes. Name, no. Nothing on it says Sarah. If my colleague opens
this next week, that's just a note. Could be hers, could be the L1 who escalated it, could be
anybody."

"In our case system every comment is stamped with whoever was logged in. I never think about it.
So my first question is: where's the stamp?"

**First wrong place: the note itself.** "There's a '...' on the note card. That's where I'd expect
'edit', maybe 'sign' or 'author', something." (The HTML gives that button nothing behind it in this
mock.) "Nothing. OK."

**Second wrong place: the notes list (take a note, 5).** Next session, Notes on the left rail. Six
notes, each with a date and time on top: "Sep 21 2026, 10:14", "Sep 20 2026, 16:05", "Sep 19
2026, 09:40". "Still no names. All mine, I suppose, but it doesn't say so. There's a little
filter icon next to 'Find in notes' -- I'd hope that's 'filter by author'." (The HTML wires
nothing to it.) "Dead end. I'd type my name into Find in notes out of habit, and it would find
nothing, because my name isn't in any of the text."

"'Detached -- the set this note pointed to was changed. Bring back Suspects, first pass.' OK, that
I like, that's an audit trail thing. Not what I'm here for, but noted."

**What a two-person project looks like (notes panel, 3 to 5).** The moderator's other screens show
a different project, proteins, with two people's notes. "Oh -- here it does it. 'Adam Powers, Sep
28 2026, 10:14', 'Lin Chen, Sep 27 2026, 16:42'. Name, then date and time, right under what the
note is about. That's exactly what I want. So why doesn't mine show it?"

"And the row menu on Adam's note says Edit note, Delete note. Question: can Lin edit Adam's note?
Because if my colleague can open my note, change 'likely the collector' to 'confirmed collector',
and it still says Sarah Okafor on it, that's a problem. That's my name on a sentence I didn't
write, in a case that goes to an examiner. Nothing here tells me either way."

"Find in notes on 'Betweenness' highlights the word in the note and in the Cites line. Would it
find 'Lin Chen'? I'd want it to. Or I'd want that filter button to say 'Only mine' / 'Only hers'."

**View only (notes panel, 9).** "'View only' up by the project name. The rows lose the edit menu.
Fine. If my colleague opens it view-only she can't touch mine. But next week she's not reading
it, she's working it -- she'll be adding her own notes, so it won't be view-only."

**Third place, the right one: the main menu (Preferences, 1).** "I don't go into settings on
purpose. But I'm out of ideas, so -- three lines, top left. File, Edit, View, Selection,
Algorithms, Recipes, Preferences, Help. Preferences. Scroll wheel, WebGPU -- don't know, don't
care -- Theme, Reduced motion, Default overview. And at the bottom: 'Your name on notes and
recipes...' with 'Sarah Okafor' under it. There it is."

"So it's been there all along and I didn't know. That's the whole problem in one screen: it's
already set, and nothing I looked at told me."

**The name dialog (Preferences, 2).** One field, "Name", filled with Sarah Okafor. Under it:
"Saved with each note and recipe you make from now on, exactly as typed. Shown only when a project
holds work by more than one person. Leave blank to record no name." Cancel, Save.

She reads it twice, slowly, because this is the part that decides whether she trusts it.

"'Exactly as typed.' So it's not my login. It's whatever I type. My colleague could type 'Sarah
Okafor' in her browser and her notes would say Sarah Okafor. For our team, fine, we're not going
to forge each other. For anything an auditor looks at -- that's not a signature, that's a label.
I'd never call it an audit trail."

"'From now on.' So the notes I already wrote -- were they saved with my name or not? If I set this
up today, is my SAR note from last Tuesday going to show up as nobody? There's no way to see what
name a note was saved with until someone else adds a note. I'd want to check before I hand it
over, not find out after."

"'Shown only when a project holds work by more than one person.' OK -- so that's why my notes had
no name. It's hiding it because I'm the only one. I get the logic, it's less clutter. But it
means I can't see that it's working. My colleague will see it. I won't, until she's already in
there. I'd rather it just always said my name. It's one line of grey text."

"And where is this kept? The dialog doesn't say. If it's in the browser, and IT reimages my laptop, or I
log in at a hot desk on the fourth floor, my notes from that machine are 'nobody' and I won't
know."

**Checking what leaves the building (Export, 6).** "The evidence file. 'Page 1. Boundary. Filter
step: in Mule ring suspects (a frozen set of 14 accounts), from transfers-2026-03.csv, written
2026-09-28 by Sarah Okafor.' Good. That's the one place it matters most and it's there. My name is
on what goes in the case file. I'd still want each note inside the report to carry its author,
because the report says 'Ring overview, 2 notes' and 'Other notes, 2 notes' and if two of them are
my colleague's, the reviewer has to know which. I can't see pages 2 to 4 in the preview, so I
can't tell."

**Where she lands.** "Did I do the task? Yes -- the name was already set, so technically there was
nothing to do. But I only know that because I opened a menu I'd normally never open, after three
places that should have told me and didn't. If I'd stopped at the notes list, I'd have written
'SO' at the start of every note by hand. That's the workaround. That's what people will do."

## Workarounds she said she would use

- Type her initials or "-- SO" at the start or end of every note, so it is in the text and
  survives any machine, any browser, and the Find box finds it.
- Before handing the project over, ask the colleague to open it and read back which notes show a
  name, because she cannot see it herself while she is the only author.
- Keep the real record of who concluded what in the case system comments, where the login stamps
  it, and treat graphty notes as scratch.

## Single Ease Question

"Four. It was already set, so there was nothing to do -- and it still took me four places to find
out. If my name had been on the note I just wrote, this would have been a seven and a five-second
task: look at the note, see 'Sarah Okafor', done."

## Would she use this instead of her current tool?

"For this -- telling my notes from hers -- no. The case system already does it and I don't have to
think about it: I'm logged in, every comment has my user ID and a timestamp, and nobody can type
someone else's name. This is a name I type into a browser. It's fine for two of us working a ring
together in the chart. It's not something I'd point an examiner at.

Against i2, it's better -- i2 doesn't really do shared notes at all, we paste them into Word. And
the evidence file putting 'written by Sarah Okafor' on page one is the right instinct. Show my name
on my own notes all the time, tell me when a note has no name on it, and don't let someone edit my
note and leave my name on it. Then I'd trust it for the chart, and leave signatures to the case
system."

## What the session showed (plain summary)

1. A note's author is hidden whenever the project has one author. So the person the task is
   about can never check that her name is being recorded; the note she just wrote shows a date
   and no name. She went to the note's own menu, then the notes list and its filter button, and
   only then the main menu.
2. The name setting is in Preferences, under "Your name on notes and recipes...". Once she was
   there, it was clear and fast. She would not have gone there on her own if she hadn't run out of
   other places.
3. "Exactly as typed" means the name is a label, not an identity, and the dialog does not say
   where the name is kept (the design keeps it in the browser, so another machine records no
   name). For a fraud investigator that rules it out as an audit record, though it is fine
   for telling two teammates' notes apart.
4. "From now on" leaves notes written before the name was set with no name, and nothing shows
   which notes those are.
5. Nothing says whether a colleague can edit her note and leave her name on it. For her, this was
   the most serious open question in the session.
6. The evidence file names the writer on its first page. She wanted each note inside the report to
   name its author too; the preview did not show whether it does.
7. The notes list in her project (date on top) and the two-author project (About line on top,
   then name and date) lay rows out differently. She noticed the name, not the order; low
   importance.
