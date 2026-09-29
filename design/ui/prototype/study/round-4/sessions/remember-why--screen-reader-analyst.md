# Remember why -- Screen-Reader Analyst (Morgan)

**Participant:** Morgan, senior analyst at a regional public-health agency, blind since their early
twenties. NVDA in Chrome, keyboard only, screen curtain on. Keeps a plain-text file of keystrokes
for every tool. Today the way they remember why they kept a group is a comment at the top of the
Python script that builds it, or a line in a text file next to the data.

**Task as given by the moderator:** "You kept these accounts aside for a reason. Leave yourself a
note on why, so you remember next week."

**Screens used:** screens/take-a-note.html (the "March transfers" project, 3,000 accounts, one kept
set "Mule ring", 14 accounts), in the participant view, states 1 to 5 and 8; screens/notes-panel.html
(the protein project), states 1 and 10, for the case where nothing is selected;
flows/take-a-note.html. What Morgan "hears" below is what each page exposes to the accessibility
tree (roles, names, tab order), read from a scripted walk of the participant view, plus the render
for anything the moderator described. Where the mock is static and a real product would behave
differently, the moderator said so once and it is marked.

**Outcome:** done, with one dead end (the toolbar's Note button), one question to the moderator
(is there an edit field?), and a result I would check twice before trusting. **Single Ease
Question:** 4 of 7.

---

## Think-aloud

### 1. Arriving: what is this, and where are "these accounts"?

"Title: 'Take a note'. That's the page, not the project, but fine. Heading key."

H: "March transfers, heading level 1." H: "Graphs, heading level 2." H: "Sets and paths, heading
level 2." H: "Views, heading level 2." H: "Statistics, heading level 2." H: "Members 14, heading
level 2." H: "Appearance, heading level 2."

"OK. It has named its parts. I'll give it that. 'Members 14' -- members of what? Nothing told me what
the Statistics and Members are about. Let me go back up."

Down arrow from "Sets and paths": "Add to Sets and paths, button. Sets and paths, list. Mule ring,
frozen, 14, selected."

"There's one kept thing and it's called Mule ring. Fourteen of something. 'These accounts' has to be
that -- it's the only group anyone put aside. 'Frozen' I'm reading as 'doesn't change when the data
does', which is what I'd want from a list I kept on purpose. I'd want that confirmed somewhere, but
not now. It's already selected, so I don't have to do anything to pick it. Good, because I don't know
yet what pressing Enter on it would do."

"Arrowing on into the inspector: 'Mule ring, Frozen set.' That's plain text, not a heading. So the
one line that tells me what the whole right side is about is the one line I can't jump to. The
headings under it -- Statistics, Members -- float. I found the owner by arrowing, which I only did
because I was already suspicious."

### 2. First try: the Note button (dead end)

Tab, Tab, Tab... "Select, toggle button, pressed. More tools. Path. Note, button."

"Note. Button. I've been asked to leave a note. I'm pressing it. What else would anybody press?"

Enter. "Note, toggle button, pressed." Silence.

"...And? Pressed. Nothing else. No 'choose what the note is about', no edit field. I'm in a toolbar
with a tool armed and nothing to point it at." (The moderator confirms, when asked later, that this
tool wants a click on an account in the drawing.) "So it's a pointing tool. For me that's a button
that turns on a mode I can't use. Escape." Esc. "Note, toggle button, not pressed. Fine, at least it
let go."

"Write that down: a button called Note that doesn't take a note unless you have a mouse. The next
person I train will press it first, exactly like I did, because it's the one that says Note."

### 3. Second try: the set's own menu

"The inspector had buttons after the name. Let me hear them." Tab: "100 percent, button. Members,
button. Filter steps, button. Add, button. More actions, button."

"'Add.' Add what? Add accounts to the set? To a set I froze on purpose? Not pressing that. 'More
actions' is where things go to hide in every tool. Enter."

"Menu. Compare with... Collapse. Hide on canvas. Run layout. Extract as graph." End. "Add note..."

"There. Last item, under a separator. I'd never have looked for a note under 'Run layout', but a
menu I can read with arrows is a menu I can use. It's a real menu, it says 'menu', the items say
'menu item'. Enter on Add note."

The moderator notes that the same command is also in Quick actions and in the context menu
(Applications key). "Then I'd have liked to know that before I spent ten keystrokes finding it. I did
try the Applications key on the list row, and nothing happened here -- but this is a picture of an
app, so I'll believe you it's there. It goes in my keystroke file as 'unconfirmed'."

### 4. Writing: is there an edit field?

"Heading: 'New note, heading level 2'. Then 'More actions for New note, button. Close, button.'
Then, arrowing: 'About Mule ring, 14 accounts.'"

"Good. That's the most important thing it could say, and it said it before I typed anything. This
note is about the ring, not the whole graph and not one account. If it had said 'About the graph
Transfers' I'd have pressed Escape and started over."

"Now where do I type? I hear the About line and then the text, read as text. No 'edit', no
'multi-line'. Tab skips from Close straight to another Close."

(One question to the moderator, the only one this task: "Is there an edit field here?" Moderator:
"In the product, focus lands in the text box when the editor opens, right after the About line. This
page is a picture, so the box is not a real field.") "OK. I'll take it on trust for this session. In
a real tool, if focus doesn't land in the box and the About line isn't read on the way in, this whole
thing fails at the first keystroke. That is the part to test with a real screen reader, not a
picture."

"What I type: 'Kept because all 14 share one device and cash out within a day. Check again after the
April load.' Two sentences. Now -- how do I finish it?"

Arrowing past the box: "Cites. PageRank, full graph. Close, button. Quotes. Quote a value.... Enter
adds. Shift plus Enter, new line. Add, button."

"Three things.

"One: 'Enter adds' is after the box, after the citations, after the quotes. I only heard it because
I arrowed past everything. If it's not read when focus enters the box, I'm going to press Enter at
the end of my first sentence to start a new line -- that's what Enter does in every text box I own --
and post half a note. In Teams, Enter sends; in Excel, Enter moves on; in a notes box, I expect a new
line. Tell me on the way in. Once. Not every time I come back.

"Two: two buttons in this box are both called 'Close'. One of them closes the note. The other one,
I'm told by the picture, removes the PageRank citation. I can't tell them apart and I'm not guessing,
because one of those guesses throws away what I just wrote.

"Three: 'Cites PageRank, full graph'. I didn't cite anything. Where did that come from? If the tool
attached a PageRank run to my note because it was lying around, my note now claims to rest on a
number I didn't choose. Which PageRank? Directed? What damping? Normalised? The result note on
another screen says 'Directed, damping 0.85, unweighted', and that's the right answer -- but it isn't
here, where the citation is."

"'Quote a value...' -- I'd skip it today. I heard 'listbox, Quote a value', options like
'ACC-753261 0.000551'. A number with no name in front of it. PageRank, I suppose, because the group
heading said 'PageRank (cited)'. If I quote it, I want the note to say what it is."

### 5. Adding: did it work?

"I press Enter." (The moderator describes state 3: the editor now reads 'Note' with the date, the
inspector has grown a Notes section with one row, and a marker '1' is drawn on the canvas. No message
is announced.)

"So it worked and nobody told me. The page's own notes say 'no notice: the note is already on
screen'. On screen. I don't have a screen. From where I sit, I pressed Enter, the heading changed
from 'New note' to 'Note' if I go back and read it, and that's all. Say 'Note added' once. One time.
Then shut up about it. That's the whole request."

"Checking it myself. H to the inspector: 'Notes 1, heading level 2.' 'Add to Notes 1, button.' --
that one reads like I'm adding to a note called 'Notes 1'. -- 'Notes 1, list. Just now. Kept
because...' Fine. It's there, under the set it's about. That's where I'd look next week."

"But the editor said 'Sep 28 2026, 10:42' and the list says 'just now'. Same note, two different
times. Next week 'just now' will be wrong, so I assume it changes. I'd rather it said the date."

"And the canvas: 'Graph drawing, application' and then '1'. One what? That's the marker. It's a
number with nothing next to it. I'll ignore it, which is what I do with most things inside an
application region."

"Escape to leave the editor." (The moderator: in this design, Escape on a note with text keeps the
note.) "Good that it keeps it. But you should know Escape is also my key for getting NVDA out of
focus mode. If Escape in that box ever means 'throw it away', I'll lose notes without meaning to. If
it means 'keep it and close', fine -- say 'Note added' when it does, because I won't have pressed
anything that sounds like 'add'."

### 6. The other start: nothing selected

Notes panel, empty (protein project, state 1): "'No notes yet. A note can be about a selection, a set,
a result or the whole graph. Add note..., button. Notes are saved in the project and travel in
project files and findings reports.'"

"Now that's a good empty panel. Three sentences, it tells me what a note is for and where it goes. I
heard it once and I don't need it again."

"Add note, with nothing selected (state 10): 'New note, heading level 2. About colon. The graph Human
protein interactions.' Then a list, 'About': 'The graph. Kept sets. TP53 neighborhood, 33 proteins.
DNA repair, 30 proteins. Select something first.'"

"This is what I'd actually use. I don't want to go select the ring first -- I want to say 'note, about
Mule ring' and type. The kept sets are listed by name with a count. 'Kept sets' is my word -- 'kept
aside' -- so I'd find it. Two worries. The default is 'the graph', ticked. If I Tab past the list
because I think it's a label, my note is about the whole graph and I've made the exact mistake the
About line is meant to prevent. And in this picture the choices read as text, not as options -- Tab
doesn't reach them. The moderator says in the product arrows and Enter pick one. I'll believe that
when I hear 'option, 2 of 4'."

### 7. Next week: can I find it again?

Rail: "Notes, button." Enter. (State 5.) "'March transfers, heading level 1. Full graph, button. Find in
notes.' -- that's read as text, not an edit field, in this picture. 'Filter, button.' 'March transfers,
list.'"

"The list is called 'March transfers'. That's the project's name. The list of notes should be called
notes. When I'm in a list and I ask NVDA where I am, 'March transfers' tells me nothing."

"First row: 'Sep 21 2026, 10:14. Referred for a SAR. 14 personal accounts in 7 countries, riskScore 88
to 98. ACC-753261 ranks highest in the ring by PageRank: likely the collector. About Mule ring, 14
accounts. Cites PageRank, full graph.'"

"Everything I need is in there, and in the wrong order. Date, then the whole paragraph, then -- last
-- what it's about. At my rate I hear two words of each row and decide to skip. Two words here is
'Sep 21'. Every row starts with a date. Next week I'm looking for the note about the ring, not the
note from Tuesday. Put 'Mule ring' first and I'd arrow down the list in five seconds. As it is, I'd
use Find."

"Row about a deleted set: '...Kept for the audit trail. About Suspects, first pass. Detached. The set
this note pointed to was changed. Bring back Suspects, first pass, as kept Sep 19.' It says 'bring
back', but it's all one option in a list. I can't Tab to 'Bring back' as a button from inside a list
row. And 'Detached' and 'changed' -- was the set deleted, or edited? Those aren't the same to me."

"Enter on the Mule ring row: the canvas selects the 14, the note opens beside them, and the
inspector's Notes section highlights it. Focus -- where? If it jumps to the note, tell me. If it
stays on the row, fine. If it goes to the canvas, I'm lost. This picture can't tell me; I'm recording
it as the thing to test."

### 8. A month later

State 8, after April's data replaced March's: "'Cites PageRank, full graph. Exclamation mark. Earlier
data. Add current value.' And the quote: 'ACC-753261 pagerank 0.000551, exclamation mark, now
0.000428, in April's data.'"

"This is the part I actually like. It kept what I wrote, and it tells me in words that the number
under my note has moved. That's what I'd do by hand in my script: rerun, compare, add a line. Two
things: 'exclamation mark' is what NVDA calls that icon, and it's read before the words. Say the word
('changed') and drop the punctuation. And this marker only lives in the editor and on the row -- I
want to hear it when I land on the row, first, not after the paragraph."

### 9. The flow page

flows/take-a-note.html in the participant view: "'Leave the participant view, button.' Tab. Body.
Tab. Same button. That's all there is." In this view the page reads nothing at all. "A blank page with
one button. I'm skipping it."

---

## Single Ease Question

**4 of 7.** "Writing the note, once I found the menu, was easy, and the About line is exactly right.
Getting there cost me a dead button called Note and a trip through 'More actions'. Knowing it was
saved cost me going back to look, because it doesn't say. And finding it again means listening to a
date and a paragraph before I learn what each row is about. That's a four. Not a two -- nothing
trapped me and nothing lost my text."

## Would you use this instead of your current tool?

"For this, today: no, I keep my text file. It's one line per group, subject first, I can grep it, and
it's still there when the tool isn't.

"What would change my mind is the month-later screen. My text file doesn't know the number under my
note moved. Mine goes stale silently; this one says 'earlier data, now 0.000428'. If the notes come
out in the findings report as text with what they're about first -- and I've been told they do, as an
HTML file that opens offline -- I'd use this for notes on anything a sighted colleague is also going
to read, because then we're both looking at the same sentence attached to the same group.

"Before that: kill the Note button or make it work without a mouse, say 'added' once when it's added,
name the two Close buttons differently, and put the subject first on every row. The same four
things, in that order. Then I'd try it again with real NVDA on a real build, not a picture. I don't
praise anything that I've only heard described."

---

## Problems observed

1. **A toolbar button named "Note" that does not take a note from the keyboard.** In the take-a-note
   screens the toolbar holds "Note, button" (the Note tool, state 4). A keyboard user asked to leave
   a note presses it first; it arms a pointing mode that needs a click on the drawing and announces
   only "pressed". The notes panel screen and the flow say there is no Note tool, so the screens also
   disagree with each other. Severity 3.
2. **Adding a note is silent.** Enter commits the note and nothing is announced ("No notice: the note
   is already on screen"). A screen-reader user only learns it worked by going back and reading the
   editor's heading or the inspector's Notes section. Same for Escape, which in this design keeps a
   note with text: the user pressed nothing that sounds like "add". Severity 3.
3. **Two buttons in the note editor are both named "Close".** One closes the editor; the other removes
   the cited run. The user cannot tell them apart and will not risk either. Severity 3.
4. **Notes panel rows read date first and subject last.** Each row is read as date, full text, then
   "About Mule ring, 14 accounts", then what it cites and any "Earlier data" or "Detached" mark. At a
   fast speech rate the first two words decide whether a row is skipped; here they are always a date.
   The list itself is named after the project ("March transfers"), not "Notes". Severity 3.
5. **The Enter-posts rule is said after the text box, not on entering it.** "Enter adds. Shift+Enter,
   new line." comes after the citations and quotes; a user who expects Enter to start a new line
   posts half a note. Severity 2.
6. **The inspector's owner line is not a heading.** "Mule ring, Frozen set" is plain text, so heading
   navigation reaches Statistics and "Members 14" without ever saying whose they are. Severity 2.
7. **A citation Morgan did not choose.** The new note already "Cites PageRank, full graph", with no
   settings (directed, damping, normalised) where the citation is shown. Morgan will not let a note
   claim to rest on a number they did not pick or cannot see defined. Severity 2.
8. **"Bring back" is buried inside a list row.** On a Detached note the recovery action is part of
   one option's text, not a control a keyboard user can reach; "Detached" and "was changed" do not
   say whether the set was deleted or edited. Severity 2.
9. **With nothing selected, About defaults to the whole graph and Tab keeps it.** A user who tabs past
   the About list takes the graph silently, the very mistake the About field exists to prevent. In
   the mock the choices are also not exposed as options. Severity 2.
10. **Unlabelled or ambiguous names:** "Add" on the set's type row (add what?), "Add to Notes 1", the
   canvas marker read as a bare "1", quoted values with no measure name ("ACC-753261 0.000551"), and
   the warning icon read as "exclamation mark" before its words. Severity 1.
11. **Two forms of time for one note.** The editor says "Sep 28 2026, 10:42"; the inspector row says
   "just now". Severity 1.
12. **The flow page reads as empty in the participant view** -- one "Leave the participant view"
   button and nothing else. Severity 1.

Mock-fidelity notes (not counted against the design, but the first things to test on a build): the
note text, "Find in notes" and the About choices are not exposed as editable fields or options in
these pages, so where focus lands when the editor opens, after Enter, and after a Notes row is chosen
could not be heard.

## What worked

- **"About Mule ring, 14 accounts" is read before a word is typed.** It named the subject and the
  count, in words, first. Morgan: "That's the most important thing it could say."
- **The set's overflow is a real menu.** "More actions, button", then menu items read by arrow keys,
  "Add note..." last. Found by elimination, but found without help.
- **The empty Notes panel explains itself in three sentences**, including where notes go (the
  project file and the findings report), and does not repeat them once notes exist.
- **"Kept sets" in the About list** matches the words of the task ("kept aside"), with each set's
  member count.
- **The month-later marks say in words that the number under the note moved** ("Earlier data", "now
  0.000428, in April's data") and keep what was written. Morgan: "My text file can't do that."
- **The inspector's "Notes 1" heading** puts the note under the set it is about, reachable by the
  heading key next week.
