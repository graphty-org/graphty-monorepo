# Session: notes with names -- Nadia, level-1 alert reviewer

Task as read to the participant: "A colleague opens this project next week and will read your
notes beside her own. Make sure she can tell which ones are yours."

Screens seen, as a participant sees them (design notes hidden): the Notes panel empty and with
notes (screens/notes-panel.html, states 1, 3, 4 and 11), the Note editor while writing and after
adding (screens/take-a-note.html, states 1 to 3), the main menu's Preferences submenu and the
"Your name on notes and recipes" dialog (screens/preferences.html, states 1 and 2), and the
navigation page. Renders: shots/screens__notes-panel.png, shots/record/screens__notes-panel-s3--study.png,
shots/record/screens__notes-panel-s4--study.png, shots/record/screens__notes-panel-s11--study.png,
shots/screens__take-a-note.png, shots/record/screens__take-a-note-s2--study.png,
shots/record/screens__take-a-note-s3--study.png, shots/screens__preferences.png,
shots/tmp/nadia-names/prefs-name.png.

## Think-aloud

**1. Where would my name even go.** "OK. In the case system I don't do anything for this. I log
in, every comment has my user ID on it, done. So my first question is: does this thing know who I
am? There's no login. Nothing top right, no little circle with a letter. So no, it doesn't."

**2. The Notes panel, empty.** "Notes on the left. 'No notes yet. Add note...'. Nothing here about
names. It says notes 'travel in project files and findings reports'. Fine, so the colleague gets
them in the file. Doesn't tell me whose they are."

**3. Writing a note.** She goes where she would actually start: the set, the row menu, "Add
note...". The editor opens. "About Mule ring, 14 accounts. Text box. Ctrl+Enter adds it. And
here -- 'Saving as: Marcus. Change...'. OK, that's the thing. It's going to stamp a name on it.
If it said Marcus and I'm not Marcus I'd click Change right now." Reads it twice. "That's
actually the only place on the whole screen that tells me who I am, and it's small grey text
next to the Add button. I found it because I was looking for it. On alert thirty of the day I
would not read that line."

**4. What Change... opens.** She follows it to the dialog. "Your name on notes and recipes.
Name: Sarah Okafor. 'Saved with each note and recipe you make from now on, exactly as typed.'
OK. 'Leave blank to record no name.' Why would I ever want that? ... Whatever. I type Nadia and
my surname, same as the case system, and Save." Then: "'From now on.' So the notes I already
wrote this morning, before I set this -- those have nothing on them? Can I fix those? I don't see
how." She opens a row's menu in the Notes panel: Edit note, Delete note. "Edit note is the text.
Nothing about who wrote it. So those are stuck with no name. That's exactly the thing QA would
catch: three notes in the file with no analyst on them."

**5. Also in the main menu.** She finds the same setting under the main menu, Preferences, "Your
name on notes and recipes... Sarah Okafor". "OK so it lives there too. I'd never have gone into
Preferences for this, I'd have thought that's theme stuff. The Change link in the note box is
how I'd actually find it." On the dialog's description in the Preferences page -- the name is
"kept in this browser": "My laptop is locked down. Half the time IT wipes the browser profile
after an update. So one Monday it's just blank again and I don't know, unless I happen to read
that grey line."

**6. Adding the note. My name disappears.** After Add, the note shows "Sep 28 2026, 10:42" and
the text. No name. "Wait. I just set my name. Where is it?" She checks the Notes section on the
right: date, text, no name. "So did it save it or not?" She finds the one-author state of the
panel (state 11): every row is a date and the text, no names. "OK so I guess it hides the name
when it's only me. That's... I only know that because I'm guessing. Nothing on the screen says
'your name is saved but hidden'. If I didn't trust the grey line I'd think it didn't work, and
I'd start typing my initials at the end of every note, like I do in the spreadsheet."

**7. What the colleague sees.** She looks at the panel with two authors (state 3): "Adam
Powers, Sep 28 2026, 10:14", "Lin Chen, Sep 27 2026, 16:42". "OK, this is what I want. Name,
date, time, on every row. That's fine. That's what the case system gives me." Then: "But this
only happens once her notes are in the same project, right? She opens my file, writes her
notes, and then my name pops up on mine? I think so. The screen doesn't say that either -- I'm
inferring it from the fact that it's hiding it now."

**8. The notes with no name, next to hers.** "So what does she see on my three notes from
before I set it? Just a date? Blank? 'Unknown'? If it's just a date, she'll think those are
hers. Or she won't know. That is literally the task: can she tell which are mine. For those
three, no, and I can't fix it."

**9. Finding just mine.** She types her name into "Find in notes". "Does it find my notes by my
name?" (It does not: find matches the text, what a note is about and what it cites.) "So if she
wants mine, she scrolls. With ten notes it's fine. With forty, from two of us, it's annoying.
The case system lets you filter comments by user."

**10. Who can change what.** Back in the row menu: Edit note, Delete note, no confirmation, on
any row including Adam's and Lin's. "So she can edit my note, and then whose name is on it? Mine,
with her words in it? Or hers? And delete it with no 'are you sure'? For an alert file that's
the part that would worry QA more than the names. In our system you can't edit someone else's
comment, you add your own."

**11. Would the picture carry it.** Her usual export test: "If I put this in the alert file, is
my name on it? The findings report, it says notes go there. I'd assume my name goes with them if
there are two of us. If it's only me it's probably just dates, which for the alert file is
wrong -- the file always needs the analyst, even if I'm the only one. QA doesn't care that I was
the only author in the project. They care whose name is on the rationale."

## Single Ease Question

**5 of 7.** "Setting the name was easy once I saw 'Saving as' in the note box -- one click, type,
save. What made it not easy: after I set it I couldn't see it anywhere on my notes, so I was
never sure it worked. And the notes I wrote before I set it stay anonymous, and I can't find a way
to fix them. If I'd set it first thing it would be a 6."

## Would she use this instead of her current tool?

"No, not for this. The case system knows who I am because I log in, and it puts my ID on every
comment whether anyone else has commented or not. I can't forget to set it and I can't lose it
when the browser gets wiped. Here the name is something I type into a browser setting, it hides
itself when it's only me, and anyone who opens the file can edit or delete my notes. For a quick
picture on an alert with a lot of counterparties -- maybe, and I'd paste the picture into the
case system and write my rationale there, where my name is on it for sure. The notes in here
would be scratch, not the record."

## What she did not understand or got wrong

- Did not know, from the screen, that her name had been saved: after adding a note in a
  one-author project nothing shows it, and the only confirmation is the grey "Saving as" line in
  the editor.
- Inferred, but was not told, that names appear on her notes once the colleague adds notes of
  her own to the same project.
- Could not find a way to put her name on notes written before she set it; the row menu offers
  Edit note (text only) and Delete note.
- Expected "Find in notes" to find notes by author name; it does not.
- Did not know what a note by a blank author looks like beside named ones.
- Did not know whose name a note carries after someone else edits it.
- Did not expect the name to be absent from her own single-author findings report, and would
  count that as wrong for an alert file.
