# Loading a messy bank export -- Marcus, criminal intelligence analyst

**Participant.** Marcus, criminal intelligence analyst at a state fusion center; i2 Analyst's
Notebook and Excel every day; not a programmer; will not load case data anywhere he cannot
account for.

**Task, as the moderator gave it.** "Your bank's case system just exported March's transfers as
a spreadsheet file. Bring it in, and tell me whether what you are looking at is what you think it
is."

**What he saw.** The start screen; the load step for the transfer export in its four states
(ready with two issues, the amount choices opened, the Excel workbook refused, and the first
view after Load); the same file in the older load step; the main window at rest on the
transfers; the Data panel for the transfers.

**Outcome.** Got it in and got a first read, with difficulty. He could confirm the row count, the
dropped-row count and the dollar total. He could not confirm that the file covers March and only
March, could not tell repeat transfers from duplicated rows, and could not find out which account
has 907 connections. He would still check it in Excel before telling anyone it was clean.

---

## Transcript

### 1. The start screen

> "Open a graph. Recent, February transfers, and Open... That's it? No Import, no drop box that
> I can see. Fine, Open."
>
> "Before I pick anything -- where does this go when I open it? This is a subpoena return. Nothing
> on this screen tells me whether the file gets read here on my machine or goes up to your
> server. I'd stop here with a real case and call IT. For the exercise I'll keep going, but
> I'm noting it."

(He later found "Nothing has been sent from this project" under the project name and "Projects
are kept in this browser" behind it -- but only after the file was already loaded.)

> "That line is what I wanted. It shows up after I've handed the file over. I needed it on the
> screen where I pick the file."

### 2. The file is an Excel workbook

> "The bank said spreadsheet, so it's an .xlsx. That's what they all send."
>
> [Could not open transfers-2026-03.xlsx: Excel workbooks are not read. In Excel, save the
> sheet as CSV (File, Save As, "CSV UTF-8"), then open that file. Nothing in graphty has
> changed.]
>
> "Okay, at least it tells me why and what to do, and that it didn't half-load something. I'd
> quote that to IT, it's clear. But it's annoying. Every bank return I've ever had is Excel."
>
> "And here's the thing -- you're telling me to run it through Excel's Save As. That's exactly
> where account numbers get wrecked. Long numbers turn into 1.23E+15, leading zeros go. These
> say ACC-something so maybe I'm lucky this time, but on a real return with bare account numbers,
> the tool just sent me through the step that corrupts the data, and then it'll tell me the data
> looks fine. Read the workbook yourself."

### 3. The load step for the CSV

> "Open transfers-2026-03.csv. Left side: Format, CSV. Source column from_account, target column
> to_account. Source and target, that's from and to. Fine, it guessed right."
>
> "Id column: 'None: ids are the account names.' They're not names, they're account numbers.
> I think it means it'll use whatever's in from and to as the thing. Leave it."
>
> "Other columns: amount, read as Currency, role Weight. timestamp, Date and time, role Time.
> Weight -- it's money, not weight. I get what they mean. Whatever."
>
> "Where do I tell it these are bank accounts? In i2 I'd pick the account entity type. There's
> no type here at all. So everything's going to be a dot."
>
> "Also nothing asks me about direction. Money goes from to to. I assume it knows that because the
> column's called from. I'm assuming."

### 4. The issues box

> "Issues, 2. Good, I read these."
>
> "'amount is written as currency text. All 9,113 values carry a dollar sign, and amounts over a
> thousand a comma.' Yes. That's the bank. Read as Currency, 9,113 weighted edges. Good, that's
> the fix I'd do by hand in Excel with find and replace."

[Opens the choice list.]

> "'$1,240.00 becomes 1240. Total $14,156,522.28. Every value kept.' Now THAT is useful. The
> total. The bank's cover letter or the case agent's summary has a total on it -- I check it
> against that first thing. Why is that buried inside the drop-down? That's the most important
> number on this whole screen. Put it on the front."
>
> "Keep as text, unweighted. No. Close it."
>
> "'412 extra parallel edges.' Parallel edges. That's your word, not mine. 'Some pairs of
> accounts made more than one transfer; 412 rows repeat a pair already read.' ...Of course they
> did. That's the pattern. Somebody sending the same guy money eleven times in a month is the
> whole reason I'm looking. You've got a yellow warning on it like it's dirty data. It's not
> extra, it's evidence."
>
> "Keep all, 9,113 edges. Good, keep all. I didn't even open the other options -- if one of them
> collapses them into one line I'd want to know it adds up the money and counts them, but I
> wouldn't pick it for this."
>
> "What it doesn't tell me: are any of those 412 the exact same row twice? Same from, same to,
> same amount, same second. Bank exports do that, the system double-posts or the export pages
> overlap. That's a duplicate, not a repeat transfer, and I have to pull those out or my totals
> are wrong. This lumps the two together. 412 could be all real, or it could be 60 real and a
> page that exported twice."

### 5. The sample and the counts

> "Sample, first 5 of 9,113 rows. Amounts as written, marked yellow. Dates look like March.
> 29th, 25th, 11th, 16th, 21st."
>
> "But the question was, is this March? Five rows isn't March. I want the first date and the last
> date in the file. Is anything from February 28th? April 1st? And what time zone -- bank's local
> time or UTC? A transfer at 11:30 at night on the 31st is April in UTC. It just says 'Date and
> time'."

(On the older version of the same load step he had also seen: "date, Mar 1 to Mar 31, UTC".)

> "The other screen had it -- Mar 1 to Mar 31, UTC. That's the line I need, right there under the
> column. This one dropped it. Put it back."
>
> "What will load: nodes 3,000, edges 9,113, rows dropped 0. So 3,000 accounts, 9,113 transfers,
> nothing thrown away. That matches what I'd expect from the row count. Zero dropped, I like
> seeing a zero written down."
>
> "Filter at import... -- is that where I'd say 'only load the accounts around my three
> subjects'? That's what I'd actually want. It's not what the task is, so I'll leave it. But I'd
> click that on a real case."

### 6. Load, and the first view

> [Load.]
>
> "Honeycomb. Gray honeycomb. That's not a link chart, that's a heat map of something. The other
> screen had a little box that said 'No labels: 3,000 accounts drawn as density' -- okay, at least
> it admits it. This one doesn't even say that. Either way I can't read a single account off
> this."
>
> "Bottom: 'transfers-2026-03.csv read: 3,000 nodes, 9,113 edges', Undo. Fine."
>
> "Right side. Statistics. Nodes 3,000, edges 9,113. Components 1, isolated 0. Density 0.00101,
> means nothing to me. Average total degree 6.08 -- each account touches about six others. Fine."
>
> "Highest total degree 907. Hold on. One account is connected to 907 of these 3,000? That's
> either the bank's own clearing or suspense account that everything passes through, or it's a
> collector. Either way it's the first thing I need to know. And that's also probably why it says
> one component -- a whole month of transfers all joined up, that's because one account ties
> everybody together. If it's the bank's internal account I have to take it out or every
> 'connection' in here is fake."
>
> [Tries to click the 907.]
>
> "It's just a number. Which account is it? I can't click it. So I've got a statistic telling me
> something's wrong with my picture and no way to see who. In Excel that's a pivot on from and to,
> sort descending, two minutes."
>
> "'Last import: 9,113 rows, 0 dropped.' Good, it kept the receipt. '412 parallel edges, kept.'
> Same thing as before. 'Directed; amount, not used yet.' Okay, it did know direction."

### 7. "For amount, a higher number means"

> "'For amount, a higher number means...' Not answered. Let's see. A closer or stronger link.
> A longer or costlier step. More can pass through. Don't use amount."
>
> "A higher number means more money. It's dollars. None of these says that. More can pass
> through -- like a pipe? A stronger link, I guess, more money is a stronger tie between two guys?
> But costlier step, it's literally a cost... I don't know which one your math wants and I don't
> want to guess and have the middleman numbers come out wrong."
>
> "I'm leaving it Not answered. It says nothing uses it until I answer. Good, then it can't do
> anything behind my back. When I run something that needs it I want it to ask me then, with an
> example of what changes."

### 8. The main window and the Data panel

> "Main window, same honeycomb. Right side: Nodes 3,000. Edges 9,113 edges (rows). Linked pairs,
> 9,113 linked pairs."
>
> "Wait. The load step told me 412 rows repeat a pair already read. So distinct pairs is 9,113
> minus 412, that's 8,701. This says 9,113 linked pairs. One of those is wrong. If I put 'about
> 8,700 account pairs' in a brief and the defense puts this screen up saying 9,113, I'm the one
> explaining it. Which one's lying?"
>
> "And the project's called something different on every screen. transfers-2026-03, then
> Transfers March 2026, then Payments network review. I assume that's me renaming it. I didn't
> rename it."
>
> "Data panel. Sources: transfers-2026-03.csv, 9,113 rows, one edge each, repeat pairs are not
> merged, read Apr 2. from_account, 'Where each transfer starts.' to_account, 'Where each transfer
> ends.' That's the plainest thing in the whole tool. amount, numbers, USD, not used yet.
> timestamp, Date and time -- again, no range."
>
> "Versions: March data, current, Apr 2, from transfers-2026-03.csv. Version history. Okay, that
> I like -- which file, when I read it. For discovery I'd want the row count and something that
> proves it's the same file the bank sent, but the file name and the date is a start. That's more
> than i2 gives me."

---

## His answer to the moderator's question

> "Is it what I think it is? Mostly. 9,113 transfers, nothing dropped, $14.16 million total -- if
> that total matches the bank's letter, the amounts came in right, and it's the only screen that
> gave me a check I could actually tie to something outside the tool."
>
> "What I can't tell you from this: that it's March and only March, because it never showed me the
> first and last date. Whether any of those 412 repeats are the same row exported twice. And who
> the account with 907 connections is -- which is the one thing on here that says my picture might
> be wrong. I'd open the CSV in Excel, do a pivot and a min/max on the date, and then I'd trust
> it. So the tool got me halfway."

## Single Ease Question

**4 out of 7.**

> "Getting it in wasn't hard once it was a CSV. The Excel refusal cost me a step and a risk. The
> currency thing it caught on its own, that's good. But the question was 'is it what you think it
> is', and for that it made me go back to Excel for the date range and the big account. And then
> two screens disagreed on the pair count."

## Would he use this instead of his current tool?

> "Not instead. Maybe next to it, for the check at the start -- the total, the dropped rows, the
> receipt of which file and when. That part's better than i2, which just swallows the import and
> doesn't tell you anything. But it has to read the Excel file straight, it has to show me the
> date range, it has to let me click that 907 and see the account, and I need the paper that says
> the file never leaves this machine before I put a real return in it. And the honeycomb isn't a
> chart I can give anybody. Until then it's Excel for the check and i2 for the chart."

---

## Observations for the studio

- **Where the data goes is answered after the file is loaded, not before.** The start screen and
  the load step say nothing about where the file is read. "Nothing has been sent from this
  project" and "Projects are kept in this browser" appear only in the main window, after Load. For
  him, the moment of risk is choosing the file.
- **The Excel refusal sends him through a step that can corrupt the data.** The message is clear
  and he would quote it, but its remedy (Excel, Save As CSV) is where long account numbers turn
  into scientific notation and lose leading zeros. A bank "spreadsheet" is an .xlsx almost every
  time.
- **The dollar total is the best check on the screen, and it is hidden.** "Total $14,156,522.28"
  is only in the amount issue's opened list. It is the one figure he can tie to a document outside
  the tool (the bank's letter).
- **"Is it March?" has no answer on the transfer load step.** The older load step showed "date,
  Mar 1 to Mar 31, UTC" under the timestamp column; the transfer load step shows only "date and
  time" and five sample rows. The Data panel shows no range either. Time zone matters for
  month-end transfers.
- **Repeat transfers are presented as a problem.** "412 extra parallel edges" with a warning
  mark reads as dirty data; to him the repeats are the evidence. The check he actually needs --
  rows that are exact duplicates (same accounts, amount and time), which bank exports produce and
  which inflate totals -- is not made, and it is lumped in with legitimate repeats.
- **A statistic points at a problem he cannot follow.** "Highest total degree 907" suggests one
  account (likely the bank's own clearing account) ties the whole month into one component. The
  number is not clickable and nothing names the account.
- **Two screens disagree on the pair count.** The load step says 412 of 9,113 rows repeat a pair,
  so there are 8,701 distinct pairs; the main window at rest says "9,113 linked pairs". This is
  the exact failure he tells stories about.
- **None of the weight meanings fits money.** "A closer or stronger link / a longer or costlier
  step / more can pass through" did not map to "more dollars". He left it unanswered, which the
  screen correctly made safe.
- **No entity type.** He looked for where to say these are bank accounts; every account renders
  as the same gray cell.
- **What he liked.** The currency catch and its counts; "0 rows dropped" written down; the Undo
  on the load; "Last import: 9,113 rows, 0 dropped" kept on the Statistics section; the Data
  panel's plain column descriptions ("Where each transfer starts"); the version record naming the
  file and the date.
