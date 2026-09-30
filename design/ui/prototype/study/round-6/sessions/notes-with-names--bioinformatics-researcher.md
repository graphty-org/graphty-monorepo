# Session: "A colleague reads your notes beside her own; make sure she can tell which are yours" -- Dr. Chen, computational biologist

Participant: Dr. Chen, group leader in a translational institute (persona:
study/personas/bioinformatics-researcher.md). Laptop on a 27-inch monitor, Chrome. She did this task
once before, on the earlier version of these screens, and said so when she recognised them.

Moderator's task, as given: "A colleague opens this project next week and will read your notes
beside her own. Make sure she can tell which ones are yours."

Screens, as a participant sees them (study view): screens/notes-panel.html (empty panel, a list by
two authors, an open note, a row's menu, a new note, the same list with one author),
screens/take-a-note.html (the note editor on a set, on one node, on the graph),
screens/preferences.html (the Preferences menu and the name dialog), screens/navigation.html (the
new header and rail, and where the name setting now lives).

Renders: shots/record/screens__notes-panel-s1--study.png, -s2, -s3, -s4, -s10 and -s11 (study view);
shots/record/screens__take-a-note-s3--study.png and -s4; shots/record/r6-chen-names-preferences.png (and the
slices in tmp/r6-chen-names/pref0.png, pref1.png); shots/record/r6-chen-names-navigation.png.

Note on the data: the notes-panel mock is a "Human protein interactions" project (300 proteins)
that already holds notes by "Adam Powers" and "Lin Chen". The note editor with its "Saving as" line
is shown only on a payments project, for a writer called Marcus. She treated the protein project as
the one she is handing over and the payments screens as the same controls in another project.

## Transcript (thinking aloud)

### 1. Open the notes

"Notes, on the left. Empty: 'No notes yet. A note can be about a selection, a set, a result or the
whole graph.' 'Notes are saved in the project and travel in project files and findings reports.'
Same as last time, and still the right first sentence -- my colleague gets the file, so she gets
the notes. That's the part I cared about before anything else."

### 2. The list with two people in it

"Now the full one. 'About TP53 neighborhood, 33 proteins. Adam Powers, Sep 28 2026, 10:14.' Then
'Lin Chen, Sep 27 2026, 16:42' on the CDK1 note. Name, full date, full time. Every row. OK -- this
is what the colleague will see. Two names, alternating, newest first. She can tell mine from hers
if my name is on them.

"Lin Chen. Is that supposed to be me? I'll assume it's me. And the note says 'Check against
the...' something, cut off -- fine, I'd click it.

"The right-hand side, the 'Notes 1' under the graph, also says 'Adam Powers, Sep 24 2026, 09:05'.
Good, the name follows the note into the other panel, it isn't only a list thing."

(She opened the TP53 note.)

"The open note: 'Adam Powers, Sep 28 2026, 10:14', the text, 'Cites Betweenness, full graph, exact,
unweighted', 'Quotes TP53 betweenness 0.114'. That's the note I'd want a reviewer to read -- who,
when, which run, which number. That's better than my R Markdown file, where the number is whatever
I pasted in on the day."

### 3. The same project with one person in it

"And here's the same list with no names at all. Just 'Sep 28 2026, 10:14'. So if it's only me,
nothing says it's me. I know why -- it's my project, why repeat my name forty times. I don't love
it, but I get it. The question is what happens next week. If she adds one note, do my forty suddenly
grow my name? Nothing on this screen tells me that. I'm guessing yes, because the two-person list
has names on everything, old ones included. Adam's Sep 24 note has his name."

### 4. Where does it get my name from

"Last time this was the whole problem: I had to trust a name I couldn't see. Let me write a note."

(She opened the new-note state in the protein project.)

"New note. 'About: The graph', and the dropdown's open over the box so I can't see the rest of the
editor. Useless picture. Let me look at the other one."

(She moved to the payments project's editor.)

"There. Bottom of the editor: 'Saving as: Marcus. Change...' Right next to Add. That's the thing I
asked for. I'm about to press Add and it tells me who it thinks I am. If it said 'Sarah Okafor' I'd
catch it here, before the note exists. Good.

"'Change...' -- I'd assume that takes me to wherever the name is set. I'd click it and expect the
name box, not a whole settings page."

(She read what the control does: it opens the name setting.)

"Fine. Two clicks, not four places like last time."

### 5. What if I never set a name

"Here's what I actually want to know. I didn't set a name before, the first time. What does this
line say then? 'Saving as: ' and nothing? 'Saving as: no name'? I don't see that version anywhere.
If it says nothing and I don't notice, I'm back to a week of anonymous notes.

"And then the colleague opens it. She has her name set. Now the project has two authors -- her and
blank. So every row gets a name except mine? She'd have to work out that the unnamed ones are me
by elimination. That works with two people. It stops working the day a third person writes one
without a name."

### 6. Setting the name

(She opened the main menu, Preferences.)

"Main menu, Preferences, 'Your name on notes and recipes...' with the current name under it. Still
Sarah Okafor, on this machine. Whose machine is this? If this is a shared workstation in the core,
that's her name on my notes unless I read that line.

"The dialog: 'Saved with each note and recipe you make from now on, exactly as typed. Shown only
when a project holds work by more than one person. Leave blank to record no name.' Clear. I can
predict all of that. 'From now on' -- so it doesn't fix old notes. Last time I said my week of notes
has no name and I can't claim them. Still true, and now it says so, which is honest, but it's still
a week of notes I can't claim without copying them and losing the date.

"'Exactly as typed.' Hmm. On my laptop I'm 'Lin Chen'. On the lab desktop, a year ago, a student set
it to 'L. Chen' or 'Chen'. Are those two authors? By 'exactly as typed', yes. So the names switch on
in my own solo project because I spelled myself two ways on two computers, and my colleague sees
'Lin Chen' and 'L. Chen' and wonders who the second person is. That's the ORCID problem in
miniature. I don't expect ORCID here, but I'd like to see the names in the project and fix one."

### 7. The header

(She looked at the navigation screen.)

"No round 'M' in the corner any more. Good -- last time I wondered if I needed an account. Now
there's nothing up there that says who I am. That's consistent: there is no 'me', there is a name
typed into this browser. I'd rather that than a fake account icon."

### 8. Checking it's done

"So: set the name in Preferences, check 'Saving as' says it, write the notes. When she opens it, her
name and mine are on every row. Yes, I think the task is done -- for new notes.

"What I still can't do: find only my notes. 'Find in notes' -- does it match authors? Type 'Chen'
and see? If it doesn't, twenty notes from two people is fine to scan, two hundred is not.

"And if she edits my CDK1 note -- fixes the log fold change, say -- whose name is on it then? Mine,
hers, both? I didn't see that anywhere. In git, blame tells me who changed which line. Here I'd
assume the note keeps my name and her change is invisible, and that's the case where it matters."

## Single Ease Question

"Five. It's easier than last time, and the one thing that made it a four -- not being able to see
who it thinks I am -- is fixed by that 'Saving as' line. It's not a six because I never saw what
happens when the name is blank, I can't claim notes I already wrote, and 'exactly as typed' means
I can accidentally be two people."

**SEQ: 5**

## Would she use this instead of her current tool?

"For notes that sit on the network: yes, over nothing, which is what Cytoscape gives me. The note
quoting the value and the exact run it came from is genuinely better than my R Markdown, and now
the name is at least visible when I write it. As the record of who concluded what -- no. A name
typed into a browser, that anyone can change, that edits don't track, is a label, not a record. I'd
use this for the lab's working notes and keep the analysis record, with authorship, in git."

## Problems she named, in her words

1. "What does 'Saving as' say when there's no name?" The blank case of the editor's name line is
   never shown, and that is the case she actually hit before.
2. "She'd have to work it out by elimination." In a project with one named and one blank author,
   the blank writer's notes are unnamed beside the other's; it stops working with three people.
3. "Exactly as typed means I can be two people." "Lin Chen" and "L. Chen" on two computers are two
   authors, which switches names on in a solo project and confuses the reader; no way seen to
   review or merge the names in a project.
4. "A week of notes I can't claim." The dialog now says old notes are not rewritten; there is still
   no way to put her name on notes written before she set it without losing their dates.
5. "Whose name is on it if she edits my note?" No sign of what happens to the author, or whether
   the edit is recorded, when someone else changes a note.
6. "Type 'Chen' and see?" No way she could see to show one author's notes; she doubts the find
   box matches names.
7. "Still Sarah Okafor, on this machine." On a shared computer the name setting holds the last
   person's name; the only warning is the line under the Preferences item and the editor's line.
8. "The dropdown's open over the box." The protein project's new-note state hides the editor, so
   she could not see the name line in her own project.
9. "If she adds one note, do my forty grow my name?" The one-author list does not say that names
   will appear once a second author arrives.

## What worked for her

- "Saving as: Marcus. Change..." next to Add: she can check the name before the note exists, and
  reach the setting in two clicks.
- Every row, the open note and the right panel's notes all show the name, full date and time when
  two people have written.
- The name dialog's sentence let her predict what the setting does, including that it does not
  rewrite old notes.
- No avatar or account icon: nothing suggests a sign-in that does not exist.
- The note carries its citation and quoted value, which she values more than the name.
