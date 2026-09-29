# Session: load a messy export -- Nadia, level-1 alert reviewer

Task as given by the moderator: "Your bank's case system just exported March's transfers as a
spreadsheet file. Bring it in, and tell me whether what you are looking at is what you think it is."

Participant: Nadia (persona: study/personas/alert-reviewer.md). Viewport 1536 by 740, as on her
docked laptop at 125 percent scaling. Screens seen, in order, as the participant sees them (design
notes hidden):

1. shots/r6-nadia-lme-transfers-not-read.png -- the export as an Excel workbook, refused
2. shots/r6-nadia-lme-transfers-ready.png -- the same export as CSV, two issues
3. shots/r6-nadia-lme-transfers-amount-policy.png -- the amount issue's list opened
4. shots/r6-nadia-lme-transfers-loaded.png and r6-nadia-lme-transfers-loaded-1440.png -- after Load
5. shots/r6-nadia-lme-frame-at-rest.png -- the same project at rest, later
6. shots/r6-nadia-lme-data-panel.png -- the Data panel
7. shots/r6-nadia-lme-load-step.png -- the older version of the open dialog (for comparison only;
   the moderator asked her to look at it after the task)

## Think-aloud

### 1. Bringing the file in

"Spreadsheet file. Our case system gives me .xlsx, that's what 'export' means. So I drag that in."

(Could-not-open screen.) "OK. 'Excel workbooks are not read.' Fine, at least it tells me what to do
-- Save As, CSV UTF-8. I can do that, Excel's on my laptop. Annoying, though: that's one more step
every single time, and I'll have two files sitting in Downloads with the same name. Which one did I
use? If QA asks, I don't know. 'Nothing in graphty has changed' -- good, I didn't break anything."

"If the case system can only give me xlsx, this is a minute gone before I've looked at anything.
One minute a time, for me, is an hour a day. But this isn't every alert, so, fine."

### 2. The open dialog

"OK, now it opened. Lot of stuff. Left side I skip -- Format, Source column, Target column, from and
to account. Those look right, it guessed them. I wouldn't touch any of that."

"Right side, 'Issues 2'. Yellow. My stomach drops a bit, yellow at work means somebody's going to
ask me about it."

"'amount is written as currency text. All 9,113 values carry a dollar sign.' ... Well, yes. It's
money. That's not an issue, that's what money looks like. And then it says 'Read as Currency (USD):
9,113 weighted edges'. Weighted edges -- I don't know what that is. I'd leave it. It's already set,
and the Load button's blue, so I guess it's fine."

"Second one: '412 extra parallel edges'. Parallel edges? ... 'Some pairs of accounts made more than
one transfer; 412 rows repeat a pair already read.' OK -- so the same person sent to the same person
more than once. That's normal. That's rent. That's not an issue either. Why is it yellow? 'Keep all'
-- yes, obviously keep all, I don't want it deleting transfers. If it had defaulted to merging those
I'd be furious, because a customer sending 9,900 three times IS the alert."

"Is it what I think it is? I want three things: how many rows, what dates, and the total. 9,113
rows -- I'd check that against what the case system said it exported. 'rows dropped 0', good, I like
that one, that's the line I'd screenshot. Dates -- I see March in the five sample rows. 29th, 25th,
11th. But five rows isn't the month. Does it go from the first to the thirty-first? Did the export cut
off at the 15th like last time the system timed out? It doesn't say."

"Total. I'd want the total dollar amount, because that's what I check against the case system report.
I don't see it."

(Moderator: she opens the amount issue's list to see what else it could be.)

"Oh -- there it is. 'Total $14,156,522.28. Every value kept.' That's the most useful thing on the
whole screen and it's hidden inside a dropdown I only opened because you told me to look. I'd never
have found it. Put that next to 'rows dropped 0'."

"Other option, 'Keep as text: unweighted edges. Measures that use weights treat every transfer as
equal.' I don't know what a measure is here. Not touching it."

"Also -- the bottom of the dialog. On my screen the Load and Cancel buttons are half off the bottom.
I can see blue, I'd click it, but I had to look for it. There's a 'Filter at import...' too. Filter
what? Does that drop rows? I'd leave it alone. If I filter something here, is that in the file or just
what I'm looking at? I can't tell from the word."

She clicks Load.

### 3. After Load

"OK. A blob of grey hexagons. That's... three thousand accounts? It says 3,000 nodes on the left.
I'll take nodes to mean accounts."

"Something popped open over the picture. 'For amount, a higher number means' -- 'a closer or stronger
link', 'a longer or costlier step', 'more can pass through'. What? A higher amount means more money.
That's what it means. None of these are 'more money'. 'More can pass through' is the closest, I
guess? 'Capacity'? I really don't know. I'd pick 'Don't use amount' because it sounds safe, but that
seems wrong too, because the amount is the entire reason I'm here."

"And wait -- in the dialog I left it on 'Weight', that was already set. Now it says 'Directed;
amount, not used yet' and 'Not answered'. So did my choice in the dialog do nothing? Did I load it
wrong? This is the part where I'd say to Sarah 'did I do this right?'. That's the thing: I can't tell
if something I did changed the data or only the picture."

"Right side: nodes 3,000, edges 9,113, components 1, isolated 0. 'Last import: 9,113 rows, 0 dropped'
-- good, same as the dialog, that I believe. '412 parallel edges, kept' -- matches. Density, average
total degree, highest total degree 907 -- skip. Highest degree 907, one account touching 907 others,
in a month? That might actually matter, but I don't know which account and it doesn't say. I'd want
to click that."

"There's a little note at the bottom: 'transfers-2026-03.csv read: 3,000 nodes, 9,113 edges', with
Undo. OK. So it read it."

"Still no dates. Still no total, outside that dropdown."

### 4. The same project later, and the Data panel

(Frame at rest.) "Now it says 'Edges 9,113 edges (rows)' and 'Linked pairs 9,113 linked pairs'.
Hold on. The dialog told me 412 rows repeat a pair. So the pairs should be 9,113 minus 412, 8,701.
It says 9,113 pairs. One of those numbers is wrong, and if QA pulled this screenshot next to the
dialog they'd ask me which one. I wouldn't know. That's a real problem -- that's the kind of thing
that makes me not trust any of the other numbers."

"And 'Attributes 9' here, but the screen after loading said '4 attributes'. Four columns in my file.
Where are the other five from?"

(Data panel.) "This one's nicer. 'transfers-2026-03.csv, 9,113 rows, one edge each; repeat pairs are
not merged.' That's a sentence I could paste into the alert file. 'from_account -- Where each transfer
starts', 'to_account -- Where each transfer ends', 'amount, numbers, USD'. That's in my words.
Why wasn't the dialog like this?"

"'Read Apr 2'. It's September -- well, in the story it's April, fine. 'Versions: March data, current'.
OK."

"I'd still want to paste an account number somewhere. There's a magnifying glass next to Graphs.
I'd try that next. But that's the next job."

### 5. Comparing with the older dialog (after the task)

"This older one says the timestamp is 'date, Mar 1 to Mar 31, UTC'. That's the thing I was looking
for! That answers 'is this March' in one glance. Why is it gone in the new one? And the amounts show
as plain numbers, 5.04, with 'currency, USD' on top, no yellow issue. Honestly I trusted that one more,
because it wasn't shouting about dollar signs."

## Answering the moderator's question

"Is it what I think it is? Mostly, I think. 9,113 rows, none dropped, repeat transfers kept, the
accounts in the right columns. But I can't tell you it's all of March -- nothing says first to last
date. I only found the total by accident. And two screens disagree about how many pairs there are.
So: I'd say probably, and I'd write 'probably' in the file, and QA hates 'probably'."

## Single Ease Question

**4 of 7.** "Getting it in was OK once I'd saved it as CSV. Checking it was the hard part -- the
numbers I actually check against, total and date range, weren't where I looked, and then the pairs
count didn't match."

## Would she use this instead of her current tool?

"No -- not for checking an export. For that I open it in Excel, sum the amount column, sort the date
column, done in a minute, and it's the same Excel QA uses. If this showed me the total, the first and
last date and the row count on one screen, in words, that I could screenshot into the file, I'd
think about it for the alerts where the counterparties matter. The picture's for Sarah anyway. And
it's not my call, somebody above me picks the tools."

## Problems observed

1. The export total ("Total $14,156,522.28") is shown only inside the amount issue's dropdown list; at
   rest the dialog has no total. She found it only when prompted and says she would never have opened
   it. Severity 3.
2. The open dialog gives no date range for the timestamp column; the older dialog showed "Mar 1 to Mar
   31, UTC". Without it she cannot confirm the export covers the whole month. Severity 3.
3. Frame at rest shows "Linked pairs 9,113" while the dialog and the post-load Statistics say 412 rows
   repeat a pair (so pairs should be 8,701). She reads it as a contradiction and it lowers her trust in
   every number. Severity 3.
4. After Load, the weight question ("a closer or stronger link", "a longer or costlier step", "more can
   pass through") has no answer matching "more money"; she would pick "Don't use amount" to be safe.
   Severity 3.
5. The dialog pre-sets amount's role to Weight, but after Load it reads "amount, not used yet" and
   "Not answered"; she concludes her dialog choice did nothing and cannot tell what the load actually
   did. Severity 3.
6. Both issues are styled as warnings but describe normal money data (dollar signs, repeat payees);
   "parallel edges" and "weighted edges" are unknown words to her. She treats yellow as "someone will
   ask me about it". Severity 2.
7. At a 740 px tall browser window the dialog's Cancel and Load buttons are cut off at the bottom.
   Severity 2.
8. The Excel workbook is refused; the recovery message is clear, but the extra Save As step leaves two
   same-named files and she cannot later tell which one she loaded. Severity 2.
9. "Filter at import..." gives no hint whether it drops rows from the data or only hides them from
   view. Severity 2.
10. Attribute count disagrees between screens ("4 attributes" after Load, "Attributes 9" at rest).
    Severity 1.
11. "Highest total degree 907" does not name the account, so the one number that might matter for an
    alert leads nowhere. Severity 1.

## What worked

- "rows dropped 0" and "Last import: 9,113 rows, 0 dropped" -- the line she would screenshot.
- "Keep all" as the default for repeat pairs; she would have been angry at a merge default.
- The could-not-open message says what to do and that nothing changed.
- The Data panel's plain-words source description ("9,113 rows, one edge each; repeat pairs are not
  merged", "Where each transfer starts") is text she could paste into an alert file.
