# Session: "A colleague reads your notes beside her own; make sure she can tell which are yours" -- Dr. Chen, computational biologist

Participant: Dr. Chen, group leader in a translational institute (persona:
study/personas/bioinformatics-researcher.md). Laptop on a 27-inch monitor, Chrome.

Moderator's task, as given: "A colleague opens this project next week and will read your notes
beside her own. Make sure she can tell which ones are yours."

Screens, as a participant sees them (study view): screens/notes-panel.html (empty, list, open note,
row menu, find, detached, filtered, view only, new note), screens/take-a-note.html (new note on a
set, quoting a value, saved, a note on one node, list, a note on the graph, a result's notes,
earlier data), screens/preferences.html (the Preferences menu and the name dialog),
screens/export-dialog.html (project menu, figure, figure in Print look).

Renders: shots/r4-chen-names-notes-s1.png to shots/r4-chen-names-notes-s10.png,
shots/r4-chen-names-take-s2.png to shots/r4-chen-names-take-s8.png,
shots/r4-chen-names-preferences.png, shots/r4-chen-names-take-a-note.png,
shots/r4-chen-names-export-dialog.png, shots/r4-chen-names-notes-panel.png.

Note on the data: the notes panel mock is the "Human protein interactions" project (300 proteins),
which already holds notes by two people, "Adam Powers" and "Lin Chen". The take-a-note mock is a
payments project with one author. The participant treated the protein project as the one she is
handing over and the other screens as the same controls on a different project.

## Transcript (thinking aloud)

### 1. Where do my notes live

"Notes, left rail. 'No notes yet. A note can be about a selection, a set, a result or the whole
graph.' 'Notes are saved in the project and travel in project files and findings reports.' Good,
that's the first thing I wanted to know -- if she gets the project, she gets the notes. Not in some
server I can't see."

"Now with notes in it. Each row: 'About TP53 neighborhood, 33 proteins', then 'Adam Powers, Sep 28
2026, 10:14', then the text. 'About CDK1 -- Lin Chen, Sep 27 2026, 16:42.' OK. So the name is
already on each note. Full date and a time, not '3 days ago'. That is how a lab notebook should
look. Good."

"Lin Chen. Not me, for the record -- but that's worth saying: there are three Chens in my building.
If the name is just a surname, this is useless. It needs to be what I type, in full."

"So the question isn't 'does it show names', it's 'is MY name going on MY notes'. Where does it get
the name from? I never logged in. There's no account anywhere on this screen. Nothing next to the
note text says 'you'."

### 2. Looking at a note I just wrote

"Take a note on a set. 'New note', 'About Mule ring, 14 accounts', text box, Cites, Quotes, Add.
No 'saving as' anywhere. I press Add."

"Saved note: 'About Mule ring, 14 accounts. Sep 28 2026, 10:42.' Date. No name. In the right panel
it says 'just now'."

"So it did NOT put my name on it. Or it did and it's not showing me. I can't tell which. That's the
whole task, and the screen can't answer it."

"The list of notes in this project: 'Sep 21 2026, 10:14 ...', 'Sep 20 2026, 16:05 ...'. Dates only,
all of them. Whereas the protein project had 'Adam Powers, ...'. So somewhere there's a rule for when
names appear. I'd guess 'only when there's more than one person'. That's a guess. If I'm right, it
means in my own project I can never see my name on my own note before I send it. The first time I'd
find out it's blank is when she opens it and tells me."

### 3. Finding where the name is set

"Right. There's no setting on the note. Edit note, Delete note -- that's all the row menu has. The
note popover's '...' presumably the same. Nothing about author."

"Project name menu at the top: Rename, Duplicate, Project info, Update with new data, Version
history, Export, Close project. I'd have expected 'Project info' might have authors. Can't see
inside it from here. I'd try it first and I think I'd be wrong."

"The hamburger, top left. Quick actions, File, Edit, View, Selection, Algorithms, Recipes,
Preferences, Help. Preferences: Scroll wheel zooms, Use WebGPU, Theme, Reduced motion, Default
overview... 'Your name on notes and recipes... Sarah Okafor.' There it is."

"That took me four places. I found it because I've used Cytoscape long enough to check Preferences
when something is missing. A postdoc wouldn't. Nothing on the note pointed me here."

### 4. The name dialog

"'Your name on notes and recipes. Name: Sarah Okafor.' Who's Sarah Okafor?"

"'Saved with each note and recipe you make from now on, exactly as typed. Shown only when a project
holds work by more than one person. Leave blank to record no name.'"

"OK, so my guess was right: names only show when there's more than one person. I understand why.
I still don't like that it hides it from me when it's just me. I want to see it on the note."

"Now, Sarah Okafor. I read the dialog as: this is whoever set this browser up last. If this is the
shared workstation in the imaging room, Sarah Okafor is the last person who sat here, and every note
I'd have written today says Sarah Okafor. That is worse than no name. It's the wrong name, silently.
There's no sign-in, which is fine, I don't want an account -- but then it has to show me who it
thinks I am at the moment I write, not in a submenu of a submenu."

"I clear it and type my name, full, the way it goes on a paper. Save. The menu line would now read
my name, I assume. Fine."

"'From now on.' So anything I wrote before I set this has no name, or has Sarah's. The moderator
said next week, so I've presumably been writing notes all week. How do I fix those? The design
text behind the menu, if I'd seen it, says changing the name does not rewrite notes already saved.
Edit note doesn't mention it either. So my option is to copy every old note into a new one and
delete the old one? That loses the date, and the date is the point. I'd want 'these unsigned notes
are mine' -- one action, with the original dates kept."

### 5. Would she be able to tell, next week

"Her side: she opens the project, it now holds my notes and hers, so the names show. 'Chen, date,
text.' She can tell mine from hers -- if both of us typed a name. If she never set hers, her notes
are blank and mine are named, and she'll know which are mine by elimination. Fine. If neither of us
set one, nothing shows and neither of us can tell. The rule says names show 'when a project holds
work by more than one person' -- how does it know it's more than one person if nobody has a name?"

"Find in notes: 'Betweenness' finds two notes, highlights the word. If I type 'Chen', does it find
notes by Chen, or only notes that say Chen in the text? Can't tell. The payments project has a filter
icon beside Find in notes; the protein one doesn't. I'd want 'show only my notes' or 'by author'.
With five notes it doesn't matter. With the sixty I'd have after a month, it does."

"'MDM2' -- empty panel. No 'no notes match'. Just blank. I'd think it broke."

"If she edits one of my notes -- fixes a typo in my TP53 note -- whose name is on it then? Mine,
hers, both? Row menu says 'Edit note'. Nothing tells me. In a lab notebook, you never edit
someone else's entry, you add under it. I'd want either 'edited by X, date' or 'you can't edit
someone else's note, reply to it'."

"Free text also means she can type my name. I don't think she would. But it's not a signature, and
I wouldn't cite it to a reviewer as provenance. It's a label. As a label for two people in one
lab, it's enough."

### 6. Sending it

"Export, from the project menu, Ctrl+Shift+E. Project file, 'Everything, with the data'. That's what
she gets. The notes go with it, with my name inside, as typed."

"The figure's methods file says 'Drawn with graphty-element 2.6.2' and the data and parameters --
no author, which is right for a figure. The findings report, from the other screen, writes 'written
2026-09-28 by Sarah Okafor' on page one. So that name goes out to whoever gets the report, which is
fine as long as it's the right name. Once the name is baked into a report I've sent to a
collaborator in pharma, it's out. Another reason to show it before it's baked in."

## Answers

**Did she complete the task?** Yes, with difficulty. She found "Your name on notes and recipes" in
Preferences after checking the note itself, the row menu and the project menu first. She replaced
the name already in the field (someone else's) with her own. She could not confirm, anywhere on the
screens, that her own notes carry her name, because a one-author project shows only the date. She
believes, but has not seen, that her colleague will see her name next week. Notes she wrote before
setting the name stay unsigned (or carry the previous name), with no way to claim them.

**Single Ease Question: 4 of 7.**
"The pieces exist -- names on notes, full dates, the name travels in the file. But the one thing
the task asked me to make sure of, I can't see. I set a name in a submenu, and then I have to trust
it. And it came pre-filled with a stranger's name."

**Would she use this instead of her current tool?**
"For notes on a network, instead of Cytoscape: yes, Cytoscape has nothing like this. I keep my notes
in an R Markdown file next to the script, and git tells me who wrote what. This is closer to the
network than that, and the note quotes the actual value and the version of the result it came from,
which R Markdown doesn't do unless I'm careful. But as the record of who concluded what, no -- git
blame is a record; this is a name I typed into a browser. I'd use it for the lab's working notes,
and keep the analysis record in git."

## Problems she named, in her words

1. "Show me who it thinks I am when I write the note." No name on the new-note form or the saved
   note in a one-author project; she cannot verify the task is done.
2. "Sarah Okafor. Who's Sarah Okafor?" The name field was pre-filled with another person's name.
   On a shared machine, that name goes on her notes silently.
3. "Four places before I found it." Nothing on a note or the notes panel leads to the name setting;
   she found it under the main menu, Preferences.
4. "My week of notes has no name." Notes written before the name was set cannot be claimed; the
   only fix she could see (copy and delete) loses the original date.
5. "If she edits my note, whose is it?" No sign of what happens to the author when someone else
   edits a note.
6. "Show only my notes." No way she could see to find notes by author; the filter icon appears on
   one project's panel and not the other.
7. "Blank. I'd think it broke." A find with no matches shows an empty panel with no message.
8. "If nobody set a name, how does it know it's two people?" The show-names rule depends on names
   that may never have been set.

## What worked for her

- "Notes travel in project files and findings reports" -- answered her first question, where the
  notes live, on the empty panel.
- Full date and time on every note ("not '3 days ago'").
- "Exactly as typed" and "Leave blank to record no name": she could predict what the name field
  does. No account, no sign-in, no avatar.
- The Preferences menu line shows the current name under the item, so she could see it without
  opening the dialog -- once she had found it.
- Each note says what it is about and what it cites.
