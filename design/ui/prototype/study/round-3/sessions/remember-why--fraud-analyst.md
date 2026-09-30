# Session: "Remember why you kept these accounts" -- Sarah, fraud investigator

- **Participant:** Sarah, level-2 financial crime investigator (composite persona, see
  `../../personas/fraud-analyst.md`). Played in first-impression mode: the tool is not mandated,
  but the moderator set the task, so she works it to the end and says where she would have quit.
- **Task as given:** "Leave yourself what you would need next week to remember why you kept these
  accounts."
- **Screens:** the Notes panel (empty, with notes, a note opened, notes out of date) and the
  inspector (one account, three accounts selected, a kept set). Renders read in the study view,
  design notes hidden:
  `shots/record/r3-sarah-remember-notes-s1.png`, `-s3.png`, `-s7.png`,
  `shots/record/r3-sarah-remember-inspector-one-node.png`, `-several.png`, `-set.png`.
- **Data on screen:** the kit's human protein interaction graph (300 proteins). There is no
  account data on these two screens, so she has to imagine her accounts onto the dots. That
  colours everything she says; see "Moderator notes" at the end.

## Transcript (think-aloud)

**1. First look, Notes panel, empty.**

> "Human protein interactions. Okay, so this is somebody else's case. I'm going to pretend those
> dots are my mule accounts. Left side says 'No notes yet. Add a note about the selection.' Fine,
> that's clear enough. 'Notes are saved in the project and travel in project files and findings
> reports.' Travel where? Findings reports -- is that something that gets sent to someone? If a
> note on a customer is going somewhere, I want to know where before I type a word in it."

She reads the grey line under the button twice. The left rail says "Assistant -- Off. Nothing is
sent." She notices it.

> "Okay, 'nothing is sent' is the thing I'd want to see, but it's next to the assistant, not next
> to the notes. Does that cover the notes too? I'd assume no until IT tells me."

**2. What "these accounts" are.**

> "The task says the accounts I kept. So first I need the accounts. I don't select anything yet
> -- the button says 'about the selection' and nothing is selected. If I click Add note now, what
> is it about? The whole thing?"

She does not click Add note in the empty state. She goes to the canvas and shift-clicks three
dots (the inspector's three-selected state).

**3. Inspector, three selected.**

> "'3 selected. Nodes.' Nodes -- that's the developer word, but okay, three accounts. Statistics:
> 3, edges inside 3, degree 13 to 32. I don't know what degree is to this screen. Is that number
> of counterparties? Say counterparties. 'Memberships: DNA repair, holds 3 of 3 nodes. TP53
> partners, holds 3 of 3.' So they're already in two groups. And then down here: Notes, 'Add a
> note.' Good, that's where I'd write it."

She looks at the icons on the first line next to Neighbors.

> "There's a filter, and then this little box icon with the dots. Is that 'save these'? No
> label. I'm not hovering every icon to find out. I'd want a word: 'Keep', 'Save as group',
> whatever. The task says I kept them -- where is the keeping? If I just write a note on three
> selected dots, and next week I've clicked somewhere else, is my note still attached to those
> three or to nothing?"

She guesses the note will stick to the three. She would click "Add a note" here. The prototype
does not show the writing step on these two screens, so she describes what she would type:

> "'Kept: 3 accounts share device ID with the escalated account, opened within 4 days of each
> other, all three passed 9,800 out within 26 hours. Not the family plan -- different surnames,
> different addresses. Pull statements Mon.' That's what I need next week. Where do I put the
> case number? Just in the text I guess. There's no case field, no disposition, nothing I can
> filter on later."

**4. Kept set, inspector.**

The moderator shows the kept-set inspector ("DNA repair, 30 nodes, Rule set").

> "Okay, so this is a saved group. 'Rule: module = DNA repair.' 'Created from: Same value as
> TP53.' That's actually useful -- it says how the group got made. That's half my 'why' for
> free: 'same device as account X'. I like that I don't have to write that part myself, if it
> works on my data. Then Statistics: edges inside 105, edges out 42 -- I'd want money there, not
> edges. Total in, total out, date range. Members by degree, 'TP53 32, #2 of 300'. Rank by what?
> For me the list should sort by amount moved. 'Notes: Add a note.' Same button as before, good,
> I'd write the why here, on the group, not on three loose dots."

> "What's this snowflake up top? Freeze? Freeze what, the picture? If that's 'lock the list so
> it doesn't change', I need that. A rule set that changes membership next week when the data
> refreshes is not what I kept. I kept these 30, not 'whoever matches this rule on Tuesday'."

She reads "Rule set" next to "30 nodes" and connects it to her worry.

> "Rule set -- so this one can change. And the other one in the left list says 'fixed'. Fixed is
> the one I want. I'd have missed that if I wasn't looking for it."

**5. Notes panel with notes.**

Moderator shows the panel with five notes written.

> "Now this is more like it. 'About TP53 neighborhood, 33 proteins, 2h.' Then the text, then
> 'Cites Betweenness, full graph'. 'About CDK1, 1d.' 'About the graph, Sep 24.' So each note says
> what it's about and when. Good. '2h', '1d' -- next week that's '9d'? I want the date. On
> printouts and in the case file it has to be a date and time."

> "No name on the notes. Who wrote this? If my L1 or my manager opens the project, I need to
> know which of these are mine. For audit, a note with no author is a sticky note, not a case
> record."

She clicks the first row (the opened-note state).

> "Clicking it lit up the 33 on the chart and opened the note on the side. That's good -- I click
> my note and it shows me the accounts. That is exactly the 'next week' thing. Next week I open
> the project, click the note, it shows me the ring. Cool. That one saves me time."

> "'Quotes: TP53 betweenness 0.114.' So it saved the number I was looking at. For me that'd be
> the amount. If it saves '9,800 out in 26 hours' with the note, and that number can't change
> under me, that's evidence."

**6. Notes out of date.**

Moderator shows the out-of-date state.

> "Yellow warning. 'Earlier run. Add current value.' Earlier run of what? I don't run things. I
> think it means the numbers were recalculated. Good that it tells me and doesn't just change my
> note. I would not click 'Add current value' without seeing what the current value is -- it
> doesn't show me. Show me old and new side by side."

> "'Detached. Restore set. The set this note pointed to was changed.' Changed by who? When? If
> someone edited my list of accounts, I need to know that, that's a big deal. 'Changed' is too
> soft. Was it deleted? Did accounts drop out? How many?"

**7. Getting it out.**

> "Before I trust any of this: can I get the notes out? 'Export files...' up top. The note says
> notes go in 'findings reports'. I'd need them in Word or a CSV with the account IDs next to
> each note, so it goes into the case file. I don't see that from here. If it's only inside this
> project, then next week I'm opening this tool to read my own notes, and I'll just write them in
> the case system instead."

**8. Delete.**

She asks what happens if she deletes a note (the row menu state was not shown to her; moderator
confirms from the prototype that Delete is immediate, undoable with Ctrl+Z, no confirmation).

> "No confirm is fine for me, I'd hit Ctrl+Z. But in a case, deleting a note should leave a trace.
> Auditors ask 'what did you know on the 12th'. If it's just gone, I can't use this for anything
> that matters."

## After the task

**Single Ease Question: 4 of 7.**

> "Middle. Writing the note is easy -- the button is there every time I have something selected
> and on the group too. Clicking the note to get my accounts back is the best part. What's hard is
> the stuff around it: which 'kept' is really kept, what the icons do, who wrote what, and whether
> I can get the notes out into my file."

**Would she use it instead of her current tool?**

> "Instead of Excel and the case system? No. My notes live in the case system because that's the
> record, and that's where my reviewer and QA look. Instead of i2 for a big ring? Maybe, for my own
> working notes -- clicking a note and getting the 30 accounts back highlighted is better than
> anything i2 does for me. But it needs a date instead of '2h', my name on the note, a fixed list
> that can't drift, and an export that puts notes and account IDs side by side. And show me it on
> accounts, not proteins."

## Problems observed

1. **No author on notes** (severity 3). "A note with no author is a sticky note, not a case
   record." She cannot tell her notes from a colleague's, and cannot use them for audit.
2. **"Kept" is ambiguous: rule set versus fixed set** (severity 3). Nothing on the note or the
   Add-a-note path tells her whether the accounts she is annotating can change membership later.
   She found "fixed" only because she was already worried about it; the snowflake icon that
   would freeze the set has no word on it.
3. **Unlabelled icons on the inspector's first line** (severity 2). The filter, create-set and
   freeze icons are icon-only; she would not hover to find out which one keeps the selection.
4. **Relative times only on the rows** ("2h", "1d") (severity 2). She wants a date and time she
   can print; hover is not enough for a printed or pasted case file.
5. **"Detached -- The set this note pointed to was changed" is too vague** (severity 3). It does
   not say who, when, or how (deleted? members dropped? how many?). For her that is the most
   important event in the list.
6. **"Earlier run -- Add current value" hides the current value** (severity 2). She will not
   press it blind; she wants old and new side by side. "Run" is not her word.
7. **Where notes go is unclear** (severity 2). "Travel in project files and findings reports"
   reads as "gets sent somewhere"; "Nothing is sent" sits next to the assistant, not the notes.
8. **No way seen to export notes with the account IDs** (severity 3). If notes cannot go into the
   case file, she will keep them in the case system and never open these.
9. **Statistics and member order speak graph, not money** (severity 2, outside the task's core):
   "edges inside", "degree", "#2 of 300" instead of counterparties, amounts, dates.
10. **Delete leaves no trace** (severity 2). Ctrl+Z is fine for her; auditors want history.

## What worked

- Clicking a note selects its accounts and brings them into view. "That is exactly the 'next
  week' thing."
- "Add a note" is in the same place for one account, several, and a kept group.
- "Created from: Same value as TP53" records how a group was made -- half her "why" for free.
- A note keeps the value it quoted, and marks rather than rewrites itself when numbers change.
- The empty panel says what to do in one line.

## Moderator notes

- Every screen in this session shows protein data. The participant repeatedly translated
  ("pretend those dots are my mule accounts", "rank by what?", "show me it on accounts"). A
  money-flow version of the notes and inspector screens would test her task honestly; the kit's
  README lists a business-shaped sample as a gap.
- The writing step (typing the note) is not on either screen given; she described what she
  would type. Her note text is a useful fixture: device ID shared, open dates, amount and time
  window, benign explanation ruled out, next action.
- The older render of the out-of-date state (`shots/record/notes-panel-s7.png`) still reads "Use
  current"; the page now says "Add current value". This session used a fresh render.
