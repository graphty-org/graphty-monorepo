# Remember why -- Analyst Alex

Participant: Alex, operations data analyst (logistics). Usual stack: NetworkX in Jupyter for the
numbers, Gephi for the picture, Excel and PowerPoint for the readout. Notes to self today live in a
markdown cell at the top of the notebook, or a comment in the spreadsheet.

Task as given by the moderator: "You kept these accounts aside for a reason. Leave yourself a note
on why, so you remember next week."

Screens seen, all in the participant view (design notes hidden): the take-a-note screen in eight
states (the transfers project, a kept set of 14 accounts called "Mule ring"), and the notes panel
screen in ten states (a protein project, a different dataset). The take-a-note flow page renders
blank in the participant view, because all of it is narration; Alex was not shown the designers'
version.

Outcome: success, with some difficulty. Alex wrote the note in the first place he looked and found
it again from two places. He misread where the "Cites PageRank" line came from, skipped the quote
feature as not for him, and could not tell from the screen whether the note leaves the building
when the project is exported.

---

## Think-aloud

### 1. The starting screen: the set, with a menu already open

> OK. "March transfers." This is a fraud dataset, not mine, but fine -- it's a graph with a bunch
> of accounts and fourteen orange ones. On the left, "Sets and paths", "Mule ring, frozen, 14". So
> that's the thing I kept aside. Frozen -- I guess that means it won't change if the data does.
> That's what I'd want.
>
> The dots menu on the right is already open, and it has "Add note..." at the bottom. Fine, that's
> where I'd go anyway -- right-click, or the three dots on the thing. In Gephi there's nowhere to put
> this at all; I'd write it in the notebook. So "Add note" on the set itself is -- yeah, that's what
> I'd hope for.
>
> If that menu hadn't been open, my first click would probably have been the "Notes" icon on the far
> left rail. It's labelled, which I appreciate. The toolbar at the bottom has a little page icon too
> but I wouldn't know that's a note tool without hovering it.
>
> One thing: the menu is sitting on top of the Statistics block, so I can't see the numbers I'd want
> to write down. Minor, it goes away.

### 2. Typing the note

> "New note. About Mule ring, 14 accounts." Good -- it tells me what I'm attaching this to before I
> type anything. That's the thing I'd worry about: does it hang off the set or off the whole graph.
> It says the set. Good.
>
> The text in the box: "Referred for a SAR. 14 personal accounts in 7 countries, riskScore 88 to
> 98..." -- in my world this would be "Kept these because they're the depots that sit on every
> northern route, check with Jan before the deck." Same idea. It's a text box. Enter adds,
> Shift+Enter new line. That's Slack's rule, I know it.
>
> "Cites: PageRank, full graph", with an x. Hm. I didn't add that. I guess because the text says
> "by PageRank" it picked up that I'd run PageRank? Or it's attaching whatever I ran last? I don't
> know. I'd leave it -- it's actually useful, it's the thing I'd forget: which measure did I use. But
> I'd like to know why it's there. If I'd typed "betweenness" would it have cited betweenness? If I
> hadn't typed any algorithm name would it cite nothing?
>
> "Quotes: Quote a value..." and there's a search open with "753" typed and it's finding
> ACC-753261's PageRank, 0.000551, and its riskScore and country. So it pastes a number in with a
> link back to where it came from. OK... I can see it for a fraud person pinning an exact score. For
> me, a PageRank of 0.000551 means nothing to a director -- I'd write "ranks first" in words. I'd
> skip this. It's not in my way though, it's one line.
>
> Hit Add.

### 3. After adding

> Popup changes to "Note", with the date and time, "Sep 28 2026, 10:42". My text, the PageRank
> citation, and the quoted value as a little chip. And on the right, under the set, a new
> "Notes 1" section with it, and a "+" to add another. And there's a little "1" marker on the canvas
> near the orange dots.
>
> The Notes row on the right says "just now" in the second screen and then the full date in the
> next one. Fine.
>
> That's it, done. That was maybe three clicks and the typing. For "leave yourself a note" that's
> the right amount.
>
> One thing I'd want and don't see: who wrote it. In this screen it's only the date. On the protein
> screens it says "Adam Powers" or "Lin Chen" -- so I guess the name only shows when more than one
> person has written notes? If I share the project file with a colleague, I'd want my name on mine
> from the start. Not a big deal for a note to myself.

### 4. A note on one account, and one on the whole graph

> Next screen, the bottom toolbar has the page icon lit up and a bar saying "About ACC-233575.
> Shift+click adds. Esc: done with this note." So there IS a note tool, and you click an account
> and type. "Highest riskScore in the ring. Request the KYC file before the SAR goes out." And it
> quoted riskScore 98 on its own. OK, that's handy for per-node reminders -- like "this depot's
> coordinates are wrong in the source table".
>
> "Esc: done with this note" -- does Esc save it or throw it away? In most things Esc is cancel. I'd
> be nervous pressing Esc after typing two lines. I'd click Add to be sure.
>
> Then one about the whole graph: "March export from the card platform. Transfers under $10 are cut
> upstream." Honestly, this is the note I'd write most -- where the data came from and what was
> filtered before I got it. "About the graph Transfers." Good that it's separate.

### 5. Next week: finding it again

> The Notes panel on the left rail now has everything, newest first, each one saying what it's
> about. "About Mule ring, 14 accounts. Cites PageRank, full graph." There's a "Find in notes"
> search box. That's what "next week" looks like -- I open the project, click Notes, there it is.
> Clicking the row opens the note next to the orange dots and selects the ring. That's good. That's
> actually the thing: the note brings me back to the accounts, not just to some text.
>
> I also see "Damping 0.85, the team default, so scores compare with last month's case. About
> PageRank." So you can put a note on the algorithm run itself. That's exactly the kind of thing I
> forget -- which settings did I use last month. I'd use that one.
>
> Then there's one that says "Detached. The set this note pointed to was changed. Bring back
> Suspects, first pass (as kept Sep 19)." Hm. So if I edit the set, the note gets unhooked? I
> thought "frozen" meant the set doesn't change. Maybe that one wasn't frozen. I'd want to know
> that BEFORE I edit a set that has notes on it, not find out afterwards. Though "Bring back" at
> least sounds like I don't lose anything.

### 6. A month later, new data

> Last screen: dates are April. Next to the PageRank citation: "Earlier data. Add current value."
> And under the quote: "now 0.000428 in April's data." OK -- THIS is the part I care about. Every
> month the data refreshes and my notes in the notebook just sit there being wrong. This tells me
> the number I wrote down is from March and gives me the April one. That's -- yeah, that's more
> than Gephi or my notebook does. I'd trust a note more because it tells me when it's stale.
>
> "Add current value" -- does that rewrite my text, or add a second number next to the old one? The
> label says "add", so I'm guessing it keeps both. I'd want both; the March one is what went into
> last month's deck.
>
> The legend at the bottom says 3,079 other accounts now instead of 2,986. So the ring kept its 14
> but the graph grew. Makes sense.

### 7. The protein screens

> These are someone else's project -- proteins. Same panel. Empty state says "No notes yet. A note
> can be about a selection, a set, a result or the whole graph." and "Notes are saved in the project
> and travel in project files and findings reports." OK, that answers "does it survive a save", which
> is my number one Gephi grudge. It says it does. I'll believe it when I reopen it.
>
> But "travel in project files and findings reports" -- that's the other side of it. If I write
> "Jan thinks this supplier is dodgy" and then send the project to procurement, that goes with it?
> I can't see a way here to mark a note as just for me, or to leave notes out when I send the file.
> For a note to myself that's what I'd worry about.
>
> "Add note..." with nothing selected asks "About:" and lists the graph, the kept sets, and "Select
> something first". Fine, that's the other way in.

---

## Single Ease Question

**6 out of 7.**

> Writing the note was easy -- it's on the set's menu, it tells me what it's attached to, it's a
> text box. It's not a 7 because of two things I had to guess at: where "Cites PageRank" came from,
> and whether Esc keeps or throws away what I typed.

## Would you use this instead of your current tool?

> For this job, yes -- probably. Right now "why I kept these" lives in a markdown cell in the
> notebook, and it's disconnected: it doesn't point at the nodes, and when the data refreshes it
> just stays wrong. Here the note is on the set, clicking it takes me back to the accounts, it says
> which measure I used, and next month it tells me the number changed. The "earlier data" thing is
> honestly the reason I'd switch for notes.
>
> But I'd still keep the notebook as the real record, because that's where the code is that I can
> rerun, and until I've seen a project reopen with every note still there I'm not putting anything
> important only in here. And I'd want to know what happens to my notes when I send the file to
> someone.

---

## Problems observed

1. **The citation appears without explanation.** "Cites PageRank, full graph" is already in the
   draft; Alex did not add it and guessed it was pulled from the word "PageRank" in the text or
   from the last run. He kept it because it was useful, but could not say how to get one or avoid
   one. Severity: moderate.
2. **Esc wording reads as cancel.** "Esc: done with this note" left Alex unsure whether Esc keeps
   typed text; he clicked Add to be safe. He would hesitate to use the fast one-account-after-another
   note tool for this reason. Severity: moderate.
3. **Notes leave with the project and there is no private note.** The empty panel says notes travel
   in project files and findings reports. Alex, who handles company data and shares project files,
   saw no way to keep a note to himself or to leave notes out of a shared file. Severity: moderate
   (not in the task, but it limits what he would write).
4. **"Detached" comes as a surprise after the fact.** Alex read "frozen" as "this set will not
   change" and then saw a note detached because its set changed. He wanted a warning before editing
   a set that has notes. Severity: minor.
5. **Quoting a raw value is not for this analyst.** Alex saw no use in quoting PageRank 0.000551 for
   a director and would skip "Quote a value...". It costs one line and was not in the way.
   Severity: minor.
6. **No author on a note until someone else writes one.** On the transfers screens the note shows
   only a date; on the protein screens it shows names. Alex wanted his name on notes from the start
   because he shares project files. Severity: minor.
7. **The open menu covers the Statistics block.** Alex wanted to copy the numbers into his note
   while the menu was covering them. Severity: cosmetic.
8. **The toolbar note tool is an unlabelled icon.** Alex would not have known the page icon was a
   note tool without hovering it; he would go to the set's menu or the Notes rail instead.
   Severity: minor.

## What worked

- "About Mule ring, 14 accounts" shows before a word is typed, which answers his first worry: is
  this attached to the set or to the whole graph.
- The note turns up in three places without him doing anything: the set's Notes section, the Notes
  rail, and a marker on the canvas. Clicking a note in the rail takes him back to the accounts.
- "Earlier data" with "now 0.000428 in April's data" after a monthly refresh. His notebook notes go
  stale without saying so, and this tells him when his note has.
- Notes on an algorithm run ("Damping 0.85, the team default") record exactly the settings he
  forgets from month to month.
