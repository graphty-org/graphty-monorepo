# Remember why -- Screen-Reader Analyst (Morgan)

**Participant (simulated):** Morgan, senior analyst at a regional public-health agency, blind since
their early twenties. NVDA in Chrome, keyboard only, screen curtain on, speech rate very fast. Keeps
a plain-text file of keystrokes for every tool. Today the way they remember why they kept a group is
a comment at the top of the Python script that builds it, or one line in a text file next to the
data, subject first.

**Task as given by the moderator:** "You kept these accounts aside for a reason. Leave yourself a
note on why, so you remember next week."

**Screens used:** screens/take-a-note.html (the "March transfers" project, 3,000 accounts, one kept
set "Mule ring", 14 accounts), participant view, states 1, 2, 3, 5 and 8; screens/notes-panel.html
(the protein project), states 1, 3, 7, 10 and 11, for the empty panel and the case where nothing is
selected; screens/sets-and-paths.html, state 7 (a frozen copy of a rule set), because it is the other
screen where accounts are kept aside. What Morgan "hears" below is what each page exposes to the
accessibility tree (roles, names, tab order), read from a scripted walk of the participant view, plus
the renders for anything the moderator described. Where the mock is static and the product would
behave differently, the moderator said so once and it is marked.

**Outcome:** done, with one question to the moderator (did it save?), no dead ends on the main
screen, and one dead-looking control on the second screen. **Single Ease Question:** 5 of 7.

---

## Think-aloud

### 1. Arriving: what is this, and where are "these accounts"?

"Title: 'Take a note'. Heading key."

H: "March transfers, heading level 1." H: "Graphs, heading level 2." H: "Sets and paths, heading
level 2." H: "Views, heading level 2." H: "Statistics, heading level 2." H: "Members 14, heading
level 2." H: "Appearance, heading level 2."

"Same as last time. It has named its parts. Statistics of what, Members of what -- still nobody says.
Back up to Sets and paths and arrow."

"'Add to Sets and paths, button. Sets and paths, list. Mule ring, frozen, 14, selected.' One kept
thing. Fourteen. That's 'these accounts'. It's already selected, so I'm not going to touch it."

"Arrowing on into the inspector: 'Mule ring, Frozen set.' Text again, not a heading. So the line that
says whose Statistics these are is still the one line I can't jump to. I knew to arrow for it because
I did this last week. A junior colleague wouldn't."

### 2. Looking for the obvious button

Tab through the toolbar: "Select, toggle button, pressed. More tools. Path. Quick actions. View mode.
View mode options."

"No Note button. Last time there was one, I pressed it, it armed a mouse mode and left me in a
toolbar with nothing to point at. It's gone. Good. I'd rather have no button than a button that lies.
The cost: nothing in this toolbar says 'note', so I have to know where notes live."

"Where I'd look next is the thing the note is about. The set. Tab into the inspector."

"'100 percent, button. Members, button. Filter steps, button. Add, button. More actions, button.'"

"'Add.' Still 'Add'. Add what? I'm not pressing 'Add' on a set I froze on purpose. 'More actions'.
Enter."

"'Menu. Compare with... Collapse. Hide on canvas. Run layout. Extract as graph.' Separator. 'Add
note...'. Last one. Same place as last week, so it's going in my keystroke file as: set, More
actions, End, Enter. Four keys. I can live with four keys if they're the same four every time."

(Moderator: the same command is in Quick actions and in the set row's context menu.) "Quick actions
I'd actually try next time -- Ctrl+K, type 'note', Enter. That's how I'd use it. I'm taking your word
that it's there; it's not in this picture."

### 3. Writing

Enter on Add note. "'New note, heading level 2. More actions for New note, button. Close, button.'
Arrow: 'About Mule ring, 14 accounts.'"

"Good. Still the best line on the page. It tells me the subject and the count, in words, before I
type. If it said 'About the graph Transfers' I'd press Escape."

"The box. In this picture it's text, not an edit field -- I know that from last week, the moderator
told me focus lands in the box in the product. I'm not asking again. Next line after the box: 'Enter,
new line. Ctrl+Enter adds the note.'"

"That's changed, and it's the right way round. Enter makes a new line, like every text box I own.
Ctrl+Enter posts, like the comment boxes in half the tools at work. So I can't post half a note by
accident any more. I'd still want to hear that line when focus enters the box, as its description,
once -- not find it by arrowing past. But the dangerous version is gone."

"What I type: 'Kept because all 14 share one device and cash out within a day. Check again after the
April load.'"

"Arrowing on: 'Cites. PageRank. Full graph, directed, damping 0.85, unweighted. Close, button.'"

"Two things.

"One: it now tells me what PageRank it is. Directed, damping 0.85, unweighted, full graph. That's
what I asked for. I can check that against NetworkX without asking anyone.

"Two: I still didn't cite it. It came in because the run was lying around. And the button that throws
it away is called 'Close'. The button at the top that shuts the whole note is also called 'Close'.
Two Closes in one small box. One removes a citation, one leaves the note. I can't tell them apart and
I'm not guessing. Same as last week."

"'Quotes. Quote a value... Saving as: Marcus. Change... Add, button.'"

"Saving as: Marcus. I'm not Marcus. So the project has someone else's name as its author, and my note
is about to go out under it. I'd press 'Change...' -- but what does it change, the name on this note,
or the setting for the whole project that everybody's notes use? It doesn't say. Right now I'd leave
it, which means next week my note says Marcus wrote it. That's the reverse of remembering why."

"'Quote a value, listbox. ACC-753261 0.000551, selected.' Still no word for what 0.000551 is. The
group label before it says 'PageRank (cited)', so I can work it out. I'm not quoting anything today."

### 4. Adding: did it work?

"Ctrl+Enter." (The moderator describes state 3: the heading now reads 'Note', the date appears, the
inspector grows a Notes section with the row, and a marker '1' is drawn on the canvas. Nothing is
announced.)

"And... silence. Again. I pressed a chord, and nothing tells me it took. I'm asking you: did it save?"
(Moderator: yes, it is added, and the editor stays open on the posted note.) "That's my one question
this session, and it's the same one I'd have asked last week. Say 'Note added' once. That's all."

"Checking it myself. Shift+H back up: 'Note, heading level 2.' It dropped the 'New'. That's the only
spoken difference between 'not saved' and 'saved' -- one word gone from a heading I'm not sitting on.

"H into the inspector: 'Notes 1, heading level 2. Add to Notes 1, button. Notes 1, list. Sep 28 2026,
10:42. Referred for a SAR...' " (the fixture's own note text). "Date and text. It's there, under the
set, and the date matches the editor now -- last week one said a date and the other said 'just now'.
Fixed.

"'Add to Notes 1'. That still reads like I'm adding to a note called Notes 1. On the protein screen
the same button is called 'Add note...'. Pick one. The second one."

"The canvas: 'Graph drawing, application' and then '1'. A bare number. Ignored."

### 5. Next week: finding it again

Rail: "Notes, button." Enter (state 5). "'March transfers, heading level 1. Full graph, button. Find
in notes' -- text in this picture. 'Filter, button. March transfers, list.'"

"The list is still called March transfers. I'm in a list, I ask NVDA where I am, it says the project
name. That's not what this is."

"First row: 'Sep 28 2026, 10:44. Highest riskScore in the ring. Request the KYC file before the SAR
goes out. About ACC-233575.' Second: 'Sep 28 2026, 10:42. Referred for a SAR ... About Mule ring, 14
accounts. Cites PageRank (full graph, directed, damping 0.85, unweighted).'"

"Date first. Paragraph. Subject last. At my rate I hear 'Sep 28' and decide. Every row starts 'Sep'.
I'm looking for the ring, not for Tuesday."

"Now here's the thing that annoys me. On the protein project's notes panel -- the other screen -- the
list is called 'Notes, newest first', and every row starts 'About TP53 neighborhood, 33 proteins',
then who and when, then the text. That's exactly what I asked for. So somebody fixed it, on one
screen. In this project -- the one with my note in it -- it's still the old way. Which one is the
product? I can't train anyone on a tool whose notes list reads two different ways depending on the
data."

"And the protein one is a tree, the March one is a list. Tree means arrows might expand things. I
don't know yet if that's on purpose. I'd find out by pressing Right Arrow and hoping nothing moves."

"Row with the deleted set, March project: '...About Suspects, first pass. Detached. The set this note
pointed to was changed. Bring back Suspects, first pass, as kept Sep 19.' Still one option, still
'Bring back' inside the row's text, not a button I can Tab to. On the protein screen it's the same,
except the word 'Detached' has an exclamation mark read before it. 'Changed' -- deleted or edited? I
still can't tell."

"Enter on the Mule ring row: the canvas selects the 14 and the note opens beside them. Where focus
goes, this picture can't tell me. Still the thing to test on a build."

### 6. A month later

State 8: "'Cites PageRank, full graph, directed, damping 0.85, unweighted. Exclamation mark. Earlier
data. Add current value.' Quote: 'ACC-753261 pagerank 0.000551, exclamation mark, now 0.000428 in
April's data.'"

"Still the part I like. It kept my words and tells me the number under them moved. My text file can't
do that. Same complaint as before: 'exclamation mark' is NVDA reading the icon, before the words. Say
'changed' and drop the icon's name. And on the row in the notes list, 'Earlier data' comes at the very
end, after the paragraph. The fact that my note is stale should be the second thing I hear, not the
last."

### 7. The other start: nothing selected (protein project)

Empty panel, state 1: "'No notes yet. A note can be about a selection, a set, a result or the whole
graph. Add note..., button. Notes are saved in the project and travel in project files and findings
reports.' Still a good empty panel."

Add note with nothing selected, state 10: "'New note, heading level 2. Close, button. About colon. The
graph. Write a note.' Then 'About, list. The graph, selected. Kept sets. TP53 neighborhood, 33
proteins. DNA repair, 30 proteins. Select something first, unavailable.'"

"The About choices are real options now. Good. 'Kept sets' is my word. But the list comes after
'Write a note' in reading order, and the moderator says focus opens on the About list in the product.
If it does, fine. If focus lands in the text, I've written a note about the whole graph without
hearing the choice. The one safety here depends on where focus lands, and I can't hear that in a
picture."

"And 'Select something first, unavailable'. It's unavailable because nothing is selected. That's the
point of it. Either make it do the thing -- close this and let me select -- or don't list it."

### 8. The other screen where things are kept: Sets and paths

(Moderator: this screen shows five sets, one of them a frozen copy dated Sep 28.)

"Heading: 'Sets and paths.' Tab: 'Add to Sets and paths, button.' Tab: 'Select, toggle button.'
Wait. Where's the list? I tabbed straight past the sets into the toolbar."

"Arrowing finds them: 'Flagged, rule, 14. High risk, rule, 143. Paid ACC-893168, frozen, 37. High risk
and Paid ACC-893168, rule, 16. Sep 28: High risk and Paid ACC-893168, frozen, 16, selected.' So
they're there, but Tab doesn't stop on them on this screen, and it did on the other one. If I'd been
using Tab only, I'd have said there were no sets."

"Toolbar: 'Select. More tools. Path. Note, button.'"

"There it is again. The Note button. Gone from one screen, back on this one. I'm not pressing it;
last time it put me in a mouse mode."

"Inspector for the frozen set: 'Sep 28: High risk and Paid ACC-893168, Frozen set, 16. Select members,
button. Filter to, button. Add to set, button. More actions, button.' Then 'Created from', Statistics,
Members. No Notes heading at all."

"Three screens, three sets of names for the same four buttons. 'Members, Filter steps, Add, More
actions' on the note screen. 'Select members, Filter to, Add to set, Set menu' on the protein screen.
'Select members, Filter to, Add to set, More actions' here. The second one is the best -- 'Add to set'
answers my 'add what?'. But my keystroke file has one line per tool, and this tool needs three."

"'Frozen from rule set, 16. Frozen on Sep 28 2026.' That's half a note already -- it says when and
where from. Not why. Why is what I'd put in the note."

---

## Single Ease Question

**5 of 7.** "Better than last week. The fake Note button is gone from the screen I did the task on,
Enter doesn't post my note any more, and the citation says what PageRank it is. Writing the note was
easy once I knew the menu. It's a five and not a six because it still doesn't tell me it saved, it
still has two buttons called Close in one box, it's about to sign my note with someone else's name,
and the list I'd come back to next week reads date first -- while the other project's list reads
subject first, which tells me somebody knows the answer and hasn't put it everywhere. Nothing trapped
me and nothing lost my text."

## Would you use this instead of your current tool?

"Not yet. My text file is one line per group, subject first, grep-able, and it's still there when the
tool isn't.

"I'm closer than last week. The protein notes list is what I'd want: subject first, then who and when,
then the text, and a list called Notes. If every project read like that, and the note said 'Note
added' when I pressed Ctrl+Enter, I'd use it for notes a sighted colleague will read too, because the
month-later warning -- 'now 0.000428 in April's data' -- is the one thing my text file can't do.

"Before I'd switch: say 'added' once; name the two Close buttons differently; put the subject first on
every notes list, not just one; don't sign my note as Marcus without asking me who I am; and make the
screens agree on the button names and whether there's a Note button at all. Then a real build with
real NVDA. I don't praise what I've only heard described."

---

## Problems observed

1. **Adding a note is still silent.** Ctrl+Enter commits the note and nothing is announced; the only
   spoken change is the editor heading losing the word "New" ("New note" becomes "Note"). The
   participant had to ask the moderator whether it saved. Same finding as the previous round.
   Severity 3.
2. **Two notes lists read two different ways.** In the protein project the list is named "Notes,
   newest first" and each row starts "About <subject>", then author and date, then the text. In the
   March transfers project (take-a-note states 5 and 8) the list is named "March transfers" and rows
   read date, full text, then "About Mule ring" last, with "Earlier data" at the very end. The
   participant cannot tell which is the product. Severity 3.
3. **Two buttons in the note editor are both named "Close".** One closes the editor, the other removes
   the cited run. Unchanged. Severity 3.
4. **"Saving as: Marcus" in a session where the user is not Marcus.** The editor names the project's
   author setting as given; a second person working in the project would post under another name
   without being asked. "Change..." does not say whether it changes this note or the project setting.
   Severity 2.
5. **The Note toolbar button is back on the Sets and paths screen.** Removed from take-a-note, still
   present on sets-and-paths ("Note, button"), where the participant expects the pointing-only mode
   from the previous round. The screens disagree. Severity 2.
6. **The sets list is skipped by Tab on the Sets and paths screen.** Tab goes from "Add to Sets and
   paths" to the toolbar; the five sets are reachable only by arrowing. On take-a-note the one set is
   a Tab stop. A Tab-only user would conclude there are no sets. Severity 2.
7. **The set's header buttons have three sets of names across three screens.** "Members, Filter
   steps, Add, More actions" (take-a-note); "Select members, Filter to, Add to set, Set menu" (notes
   panel); "Select members, Filter to, Add to set, More actions" (sets and paths). "Add" alone does not
   say what it adds. Severity 2.
8. **A citation the user did not choose.** The new note already cites PageRank because a run exists.
   Its settings are now shown (full graph, directed, damping 0.85, unweighted), which fixes half of
   last round's complaint; the note still claims a source nobody picked. Severity 2.
9. **The inspector's owner line is still not a heading.** "Mule ring, Frozen set" is plain text, so
   Statistics and "Members 14" are reached by heading without saying whose they are. Severity 2.
10. **"Bring back" is still inside a list row's text**, not a control, and "Detached ... was changed"
    does not say whether the set was deleted or edited. Severity 2.
11. **The "Enter, new line. Ctrl+Enter adds the note." hint is read after the box**, not when focus
    enters it. The behaviour is now safe; hearing the rule on the way in would save a search.
    Severity 1.
12. **Small naming problems:** "Add to Notes 1" (on the protein screen the same button is "Add
    note..."); the canvas marker read as a bare "1"; a quoted value with no measure name
    ("ACC-753261 0.000551"); the warning icon read as "exclamation mark" before its words; "Select
    something first" listed as an unavailable option. Severity 1.
13. **A frozen set on the Sets and paths screen has no Notes section** in its inspector, so the place
    the participant would look next week for "why" does not exist there. Severity 1.

Mock-fidelity notes (not counted against the design, but the first things to test on a build): the
note text box, "Find in notes" and focus placement are not real in these pages, so where focus lands
when the editor opens, after Ctrl+Enter, after choosing a Notes row, and whether the About list gets
focus first with nothing selected, could not be heard.

## What worked

- **No Note button on the task screen.** The control that armed a mouse-only mode last round is gone
  from take-a-note; the participant went straight to the set's own menu.
- **Enter makes a new line; Ctrl+Enter adds.** A paragraph break can no longer post half a note.
- **The citation states its settings** ("full graph, directed, damping 0.85, unweighted"), so the
  number can be checked against NetworkX without asking.
- **One form of time.** The editor and the inspector row both say "Sep 28 2026, 10:42".
- **"About Mule ring, 14 accounts" before a word is typed** -- still the most useful line in the flow.
- **The protein notes list reads subject first** under a list named "Notes, newest first": what the
  participant asked for last round, on one of the two screens.
- **The About choices with nothing selected are real options**, with "Kept sets" in the task's own
  words and each set's count.
- **The month-later marks** ("Earlier data", "now 0.000428 in April's data") keep what was written and
  say in words that the number under it moved.
