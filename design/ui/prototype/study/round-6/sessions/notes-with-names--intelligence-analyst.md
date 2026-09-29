# Notes with names -- Marcus, criminal intelligence analyst

Task as given by the moderator: "A colleague opens this project next week and will read your
notes beside her own. Make sure she can tell which ones are yours."

Pages used: the Notes panel (screens/notes-panel.html, all eleven states), the note editor
(screens/take-a-note.html, all eight states), Preferences (screens/preferences.html) and the
main menu (screens/navigation.html), rendered as a participant sees them, design notes hidden.
Renders: shots/r6-marcus-names-*.png and tmp/marcus-names-r6/ (np-s1 to np-s11, tn-s1 to tn-s8,
pref-0, pref-1, nav-0 to nav-2).

Setting he imagined: a case project he has been working alone for three weeks, a dozen notes on
it, some written before he ever thought about a second reader. A colleague from the narcotics
desk picks it up Monday while he is in court.

## Think-aloud

**1. Notes panel, his own project (the "one author" state).**

"Okay, Notes on the left. Here's my list. Date and time on every one -- Sep 28, 10:14; Sep 24,
09:05. Good, that's the part I like. No name anywhere, though. Every row is just a date. So if
she opens this next to her stuff, how does she know these are mine? Right now nothing on this
screen says Marcus."

He looked at the row a long time. "Last time I tried this it was the same. Nothing on the row."

**2. Row menu (the three dots on a note).**

"Edit note, Delete note. That's it. No 'sign', no 'author', nothing. Fine, I didn't really expect
it there. I'm looking for somewhere I can say 'these are mine'."

**3. Opened a note in the inspector.**

"'About TP53 neighborhood,' date, text, what it cites. Date only, no name. Same as the row."

**4. Started a new note (the editor).**

He stopped on the bottom line. "Hold on. 'Saving as: Marcus. Change...' -- that's new. Okay.
That's the first place this thing has admitted who it thinks I am. That's good. That's actually
what I asked for -- I just want to see my own name before I trust it's being recorded. If this
said 'Saving as:' and nothing, I'd know I had a problem."

Then: "But 'Marcus'. Just Marcus. There's two Marcuses in our building. I'd want my last name or
my badge initials the way our reports do it. Let me hit Change."

**5. Change... (the name dialog).**

He read it word for word, as he does anything about records.

"'Your name on notes and recipes. Saved with each note and recipe you make from now on, exactly
as typed. Shown only when a project holds work by more than one person. Leave blank to record no
name.'

"'From now on.' There it is again. So the twelve notes I already wrote -- whatever name was set
back then, that's what they carry. If it was blank, they're blank. And there's no button
anywhere to go back and put my name on them. That's the actual job the sergeant gave me. The old
notes are the ones she'll be reading.

"'Exactly as typed.' So I could type her name and write notes as her. I get it, no accounts,
nothing leaves the building -- I've said I like that. But that means this is a label, not a
signature. I'd never tell a defense attorney 'the software shows he wrote it'.

"And where is this kept? Doesn't say. The main menu entry doesn't say either. If it's the
browser, our remote desktop wipes the profile some nights. Monday morning it's blank again. At
least now the editor line would show me that -- 'Saving as:' with nothing -- if I happen to look
down there before I hit Add. Most days I won't."

He changed the name in his head to "M. [surname] (MR)" and pressed Save.

**6. Added the note, looked at it.**

"Note's in. Row says Sep 28 2026, 10:42. No name. Opened it -- date, no name. So I set my name,
the editor told me it was Marcus, I saved, and the note I just wrote still doesn't show it.
The dialog told me why -- only when more than one person. I read that. I still don't like it. I
can't check my own work before I hand it off. I'm supposed to trust it'll appear once she adds
something."

**7. The two-person view (the state with Adam Powers and Lin Chen).**

"Okay, this is what she'll see once hers are in. 'Lin Chen, Sep 27 2026, 16:42.' 'Adam Powers,
Sep 28 2026, 10:14.' Name, date, time, every row, and again on the opened note. That's a prepared-
by line. That I'd accept in a case file.

"But every note in this picture has a name. What does one of my old blank ones look like sitting
between hers? Just a date? Then she reads the list, sees 'Lin Chen' on hers and nothing on mine,
and figures the unnamed ones are... what? Hers from before she set it? Something the program
wrote? Nobody's shown me that row. That's the row I care about."

**8. Tried to filter to his own notes.**

"Find in notes. Say I type my name to pull just mine." He looked at the Betweenness search state.
"It highlights 'betweenness' in the text and in what the note cites. It doesn't highlight the
name line, so I can't tell if a name search would work. The other search -- MDM2 -- the list just
goes empty. No 'no notes match'. Is it broken or is there nothing? Tell me.

"There's a little filter icon next to Find on the other project. Clicked it in my head -- no
idea what it does. If it were 'mine / hers', great. Can't tell."

**9. Thought about edits.**

"She's going to edit one of my notes. That's what happens -- she fixes a phone number. Then whose
note is it? Nothing here says 'edited by' anything. If my name stays on her words, that's worse
than no name. I've been burned by that in a shared i2 chart."

**10. What he would actually do.**

"I'd open every old note, Edit, and type 'MR' at the front. Twelve notes. Then I'd set the name
anyway for the new ones. And I'd send her an email saying 'the ones starting MR are mine'.
That's the tool not doing the job, but it gets the job done by Monday."

## Single Ease Question

"Rate how easy it was to make sure she can tell which notes are yours, 1 very difficult to 7 very
easy."

**4.**

"Better than last time in one way -- the editor tells me who I'm saving as, and I found the
setting from right there without going through the menus. That's worth something. But the task
is my notes, the ones already written, and nothing touches them. And I still can't see my name
on anything I saved. So it's a four again. Setting the name: easy. Knowing it worked on the notes
she'll actually read: I can't."

## Would he use this instead of his current tool?

"Instead of initials in the text? Not yet. Instead of i2? No, and not because of this -- that's
the .anb files and the icons, same as always.

"If it let me put my name on notes I already wrote, showed my name on my own notes all the time
-- even if it's just me -- showed me what a no-name note looks like next to hers, and said 'edited
by' when she changes mine, I'd drop the initials. The 'Saving as' line is the right idea. Put the
same line on the note after it's saved and I'm most of the way there."

## Observations for the study (plain, for the designers)

1. The new "Saving as: Marcus. Change..." line in the note editor was the most useful change he
   saw. It is the first place he could confirm the name being recorded, and Change... took him
   straight to the setting without hunting through the main menu. He said a blank "Saving as:"
   would warn him that the name had been lost.
2. The task was still blocked where it was before. The notes a colleague will read are the ones
   already written, the dialog says the name applies "from now on", and nothing lets a person put
   their name on notes they already saved. He planned to edit each old note and type his initials
   into the text, which he called the tool not doing the job.
3. Once a note is saved, his name appears nowhere: not on the row, not on the opened note. He read
   and understood "Shown only when a project holds work by more than one person", and still said
   he cannot sign off on work he cannot check before handing it over. He asked for the saved note
   to carry the same "saved as" line the editor has, even with only one author.
4. None of the pages shows a note with no author among named notes. He feared his older, unnamed
   notes would read to the colleague as hers, or as something the software wrote.
5. The name dialog and the main-menu entry do not say where the name is kept. He assumed the
   browser, and named a remote desktop that clears the browser profile as the case where it would
   silently go blank.
6. "Exactly as typed" means anyone can type anyone's name. He accepted the reason (no accounts,
   nothing leaves the building) but called the byline a label, not a signature he could defend in
   court. A first name alone ("Marcus") is not enough in an office with two people of that name;
   the dialog gives no hint of what to type.
7. Nothing shows what happens to the byline when someone else edits a note. He said a name that
   stays on another person's words is worse than no name.
8. He could not tell whether Find in notes matches an author's name: the search state highlights
   matches in text and citations but never in the name line. A search with no matches shows an
   empty list with no message, which he read as possibly broken. The filter icon beside Find, on
   the March transfers project, has no visible behaviour; he hoped it meant "only mine / only
   hers".
9. The multi-author row -- name, then full date and time, on every row and on the opened note --
   remained the part he liked, as in the last round. He compared it to the "prepared by" line on
   his reports.
