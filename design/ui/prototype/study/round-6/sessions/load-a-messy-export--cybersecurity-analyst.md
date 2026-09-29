# Session: bring in a messy export and check it -- Priya, threat hunter

Participant: Priya, senior threat hunter at a regional bank's SOC (persona file
`study/personas/cybersecurity-analyst.md`).

Task as read to her: "Your bank's case system just exported March's transfers as a spreadsheet
file. Bring it in, and tell me whether what you are looking at is what you think it is."

Screens used, as a participant sees them (dark theme, design notes hidden): the transfer-export
load screen in its four states (the load step with two issues, the amount's choices opened, the
Excel workbook that could not be opened, and the graph just after Load), the older generic load
step, the graph at rest with the same transfers, and the Data panel. She glanced at the flow page
for the load and gave up on it after the diagram ("that's your wiring, not my screen").

Renders she looked at: `shots/r6-priya-lme-transfers-ready.png`,
`shots/r6-priya-lme-transfers-amount-policy.png`, `shots/r6-priya-lme-transfers-not-read.png`,
`shots/r6-priya-lme-transfers-loaded.png` (at her half-monitor width, 1280) and
`shots/r6-priya-lme-transfers-loaded-1440.png`, `shots/r6-priya-lme-load-step.png`,
`shots/r6-priya-lme-frame-at-rest.png`, `shots/r6-priya-lme-data-panel.png`,
`shots/r6-priya-lme-flow.png`.

## Think-aloud

**0. Before anything**

"Three questions, same as every time. Is it approved? No. Where does it run? Does it phone home?
This is a bank's case system export -- account-to-account transfers. That's customer financial
data. That is the last thing I'd put into something that isn't on the list. In real life I'd be
doing this with a scrubbed copy, account numbers already tokenised, and I'd have had to ask
the fraud team for it because it isn't even my data. For the study, fine, I'll pretend."

"And also -- 'spreadsheet file'. Our case system gives you an .xlsx. It always gives you an .xlsx."

**1. The .xlsx**

She opened the workbook first, because that is what the case system produces
(`r6-priya-lme-transfers-not-read.png`).

"'Could not open transfers-2026-03.xlsx: Excel workbooks are not read.' OK. At least it says why,
and it tells me how -- File, Save As, CSV UTF-8. 'Nothing in graphty has changed.' Good, it
didn't half-load something. Focus is on Choose another file, that's the right button."

"But I'm annoyed. Every tool I own reads xlsx. Pandas reads it in one line. And now I have to put
it through Excel, and Excel re-saving a CSV is exactly where timestamps get rewritten into
whatever the locale says and leading zeros on account numbers disappear. So you've just made
me introduce the one step that changes my data, before your tool ever sees it. That's the step I'd
want the tool to check for me afterwards. Remember that."

She saved it as CSV (in her head) and opened transfers-2026-03.csv.

**2. The load step (`r6-priya-lme-transfers-ready.png`)**

"Right. Format: CSV, comma, header row. Source from_account, target to_account. Id column 'None:
ids are the account names.' Fine, it guessed, and it showed me the guess. amount is Currency,
Weight. timestamp is Date and time, Time. That's what I'd have picked."

"Two issues, yellow. 'amount is written as currency text. All 9,113 values carry a dollar sign.'
Yeah, it's a bank export, of course it does. Default is 'Read as Currency (USD): 9,113 weighted
edges.' That's the right default. I'd have been irritated if it made me fix it."

"'412 extra parallel edges. Some pairs of accounts made more than one transfer.' That's not an
issue, that's transfers. But fine -- 'Keep all: 9,113 edges.' Keep all is right. If it had merged
them by default I'd have lost the timing on every repeat, and repeats are the whole point in
fraud. I hovered the little i once." (The mock shows no tooltip text for it.)

"What will load: 3,000 nodes, 9,113 edges, 0 rows dropped. Rows dropped zero -- that's the number I
actually want, and it's big and it's on the screen. Good."

"Now: is this what I think it is? The task is March. Where does it tell me the time range? The
sample is five rows, all March. Five rows out of nine thousand. The timestamp column header says
'date and time'. Not the first date, not the last date. And which time zone? '2026-03-29
21:09:09' -- is that UTC, is that Eastern, is that whatever the core banking system runs in? I
correlate this with Splunk, which is UTC. If the case system is local time, everything's off by
four or five hours and the first and last few hours of the month belong to the wrong month."

"This is the one thing I'd check first and it's the one thing this screen doesn't show me."

She compared with the older load step (`r6-priya-lme-load-step.png`), which the moderator had
open in another tab: "Look -- this one said 'date, Mar 1 to Mar 31, UTC' right in the column
header, and 'Date and time, UTC' in the select. That's exactly the line I want. Why is it on the
old one and not on the one for my file? Put that back."

**3. Opening the amount choice (`r6-priya-lme-transfers-amount-policy.png`)**

"The yellow thing's a select. I'll open it because I want to know what it's going to do to my
numbers."

"'"$1,240.00" becomes 1240. Total $14,156,522.28. Every value kept.' -- Oh. Now that's a number I
can check. The case system's export summary has a total. If that matches to the cent, the amounts
came across. That's the best line on this screen, and you hid it inside a dropdown. I opened it
because I'm nosy. Somebody who trusts the default never sees the total. Put it on the issue,
or better, in 'What will load' next to rows dropped."

"'Keep as text: 9,113 unweighted edges.' No. Closed it, kept Currency."

"There's no per-column profile. Min, max, blanks, distinct values. For amount I'd want min and max
-- one negative amount means reversals are in the file and that changes what the total means.
For timestamp I want first and last. For from and to, distinct counts. That's what I'd do in the
notebook in four lines: df.describe(), min and max on the time. This screen gives me one total and
five rows."

"Filter at import... -- I didn't touch it. If that's where I'd cut to March only, that's where
the time range should be shown too."

She pressed Load.

**4. After Load (`r6-priya-lme-transfers-loaded.png` at 1280, then the 1440 render)**

"Grey hexagon blob. I don't care. Nobody's going to put that in a case."

"Top left: 'Nothing has been sent from this project', and the rail says Assistant off, nothing
is sent. OK, that answers my phone-home question -- after I've loaded the data. I'd want that on
the load step, before I press Load, not after. That's backwards."

(At her half-monitor width the notice and the toolbar at the bottom of the canvas were off the
side of the mock; she saw them only on the wider render. "There was an Undo? I didn't see that.")

"Statistics. nodes 3,000, edges 9,113. Same as the load step, good. Components 1, isolated 0.
One component? Three thousand bank accounts in March and every one of them is connected to every
other through transfers? That's... possible if the export is already a case slice around one
investigation. If it's a random month of accounts it's weird. I'd want to know which. The tool
can't tell me that, fair enough, but it's the first thing I'd ask the fraud team."

"Highest total degree 907. One account is on 907 of 9,113 transfers -- ten percent. Who is that?
It's a number with no name. I'd click it. It doesn't go anywhere." (The row is not a link in the
mock.) "That's either a payroll account, a merchant, or my case. That's the most interesting
number on the screen and it's a dead end."

"'Last import: 9,113 rows, 0 dropped.' Good, it's still there after the load. '412 parallel
edges, kept.' Good. 'Directed; amount, not used yet.'"

"Wait. Not used yet? I set amount's role to Weight in the load step. It said Weight. I didn't
touch it. Now it says 'not used yet' and 'For amount, a higher number means: Not answered.' So
what did Weight in the load step do? Either the load step lied or this does. That's the kind of
thing that makes me stop trusting both screens."

She opened the question.

"'A closer or stronger link -- similarity. A longer or costlier step -- distance. More can pass
through -- capacity. Don't use amount.' It's money. A higher number means more money. None of
those is 'more money'. If I have to pick, money flows, so... 'more can pass through'? Capacity?
That sounds like pipes. I don't know what you'll do with it."

"And I didn't ask to rank anything. The task is 'is this what I think it is'. I'm going to pick
'Don't use amount' so nothing does anything clever with it behind my back, and move on." (A
fraud analyst might pick differently; she said so: "Ask the fraud people, they'd know if a big
transfer is a strong tie.")

"'4 attributes.' Four? from, to, amount, timestamp. OK, four."

**5. Looking for the time range after the load**

"Still no dates. Statistics has density and average degree -- which I will never use -- and not
the first and last transfer. That's the Splunk habit: every search has a time range printed at
the top. This has nothing."

She went to the Data panel (`r6-priya-lme-data-panel.png`).

"Sources: transfers-2026-03.csv, '9,113 rows, one edge each; repeat pairs are not merged. Read
Apr 2.' Good, that's the provenance line I'd paste into a case. amount: 'numbers, USD.'
timestamp: 'Date and time.' That's it. No range, no zone. Two places I'd expect it and neither
has it."

"Versions: 'March data, current, Apr 2, from transfers-2026-03.csv.' It calls it March data
because I told it, or because it read the dates? If it read them, show me. If I named it, it's
just a label and it could be February and it'd still say March."

**6. The same transfers at rest (`r6-priya-lme-frame-at-rest.png`)**

"Different screen, same file. 'Edges 9,113 edges (rows). Linked pairs 9,113 linked pairs.' Hold
on. Four hundred and twelve rows repeat a pair already read. So the distinct pairs are 9,113
minus 412, 8,701. Here it says 9,113 linked pairs. One of those numbers is wrong. That's exactly
the thing I cross-check, and it doesn't add up."

"And here it says 'Attributes 9, 5 more'. The other screen said 4 attributes. Where did five more
come from? Did it add columns?"

"And the 412 parallel edges line is gone on this screen. On the other one it was a yellow row
under Last import. So depending which screen I come back to, the repeat pairs are either flagged
or not mentioned."

"There's a Table at the bottom -- '3,000 nodes, 9,113 edges (rows)'. That's where I'd go. If I can
sort that by timestamp and look at the first and last row, I've answered my own question. That's
my workaround and I'm saying it out loud: I'm checking your tool with a sort, the way I'd check it
in Excel."

**7. The flow page**

She opened the flow page for loading because the moderator mentioned it. "Swimlanes. 'Did it load
the way I meant? no: Re-map columns.' Where's Re-map columns? I didn't see that on the Last import
row. If I'd picked the wrong time zone -- which I couldn't, because there's no time zone -- how
would I go back?" She did not read the bullet list below the diagram.

## Her answer to the task

"Partly. Rows: yes -- 9,113 read, 0 dropped, it said so before and after. Accounts: 3,000, fine,
I'd check that against the case system's count. Amounts: yes, if the $14,156,522.28 matches the
export total, and I only know that number because I opened a dropdown. Repeats: 412, kept, fine.
Whether it's March: I can't tell you from anything this tool showed me. No first date, no last
date, no time zone, anywhere -- load step, statistics, Data panel. The older load screen had
'Mar 1 to Mar 31, UTC' and this one doesn't. And the numbers don't agree between screens: 9,113
linked pairs on one and 412 repeated pairs on another, 4 attributes on one and 9 on another, and
the load step said amount was a Weight while the graph says it isn't used. So what I'm looking at
is probably what I think it is, but I'd have to sort the table to prove the dates, and I wouldn't
put any of these numbers in a case until the pair count is explained."

## Single Ease Question

**4 out of 7.**

"Getting it in was easy -- once it was a CSV. Two issues with sane defaults, rows dropped zero on
the screen, Load had focus. That part's a 6. But the task was 'is this what I think it is', and
for that it gave me density and average degree instead of a time range, hid the one checkable
total in a dropdown, and contradicted itself on the pair count and on the weight. Plus it won't
read the file the case system actually produces, so I had to push it through Excel, which is the
step most likely to wreck my timestamps, and then it doesn't show me the timestamps."

## Would she use this instead of her current tool?

"No. For 'did my export come across right', pandas is four lines: read_excel, len, sum of amount,
min and max of timestamp. It reads xlsx, it prints the dates, and the numbers agree with each
other. This tool gets rows-dropped right, which is more than some do, and the total is a nice
touch. If the load step showed first and last timestamp with the zone, the amount total and a
min and max per column, read the xlsx directly, and the pair count matched across screens, I'd
trust it to do the check for me and skip the notebook for this. Right now I'd do the check in the
notebook first and then load it here -- and that's also assuming it ever gets approved, which for
bank customer transfers it won't be without a review."

## Problems she hit

- No time range and no time zone anywhere for the timestamp column: not in the load step's
  column header or sample, not in Statistics, not in the Data panel. The older generic load step
  showed "date, Mar 1 to Mar 31, UTC"; the transfer load screen dropped it. She could not confirm
  the file is March. (severity 4)
- Counts disagree across screens for the same file: the graph at rest shows 9,113 linked pairs
  while 412 rows repeat a pair (distinct pairs should be 8,701); attributes are 4 on one screen and
  9 ("5 more") on another; the "412 parallel edges, kept" row appears on one screen and not the
  other. (severity 3)
- The load step sets amount's role to Weight, but after Load the graph says "amount, not used
  yet" and asks the question as "Not answered". She read it as one screen lying. (severity 3)
  Quote: "Either the load step lied or this does."
- The amount total ($14,156,522.28), the one number she could check against the case system, is
  only inside the currency policy's dropdown. (severity 3)
- Excel workbooks are refused; the case system produces .xlsx, and the prescribed Excel re-save
  is the step most likely to rewrite timestamps and strip leading zeros, which the load step then
  gives her no way to check. The message itself is clear. (severity 3)
- "Nothing has been sent" and "Assistant off" appear only after Load; the load step says nothing
  about where the file is read. She wanted it before committing bank data. (severity 2)
- The weight question ("a higher number means...") has no answer that fits money; she picked
  "Don't use amount" to stop anything using it, and did not know what "capacity" would do.
  (severity 2)
- "Highest total degree 907" names no account and does not lead anywhere; it was the most
  interesting number on screen. (severity 2)
- No per-column profile in the load step (min, max, blanks, distinct), only five rows of sample.
  Negative amounts or blank timestamps would be invisible. (severity 2)
- Re-map columns, which the flow promises from the Last import row, is not on that row in the
  mock; she saw no way back to the load choices from the graph's Statistics. (severity 2)
- At her 1280-wide half monitor the load notice with Undo and the canvas toolbar were off the
  edge of the mock; she never saw the Undo. (severity 1, may be a property of the fixed-width
  mock rather than the design)

## What pleased her

- "0 rows dropped" shown large before Load and again as "Last import: 9,113 rows, 0 dropped"
  after it.
- Both load issues default to keeping every value, so she was not forced to fix a dollar sign.
- The currency policy states its effect in counts and a total she can reconcile.
- The Excel error says why, how to fix it, and that nothing changed; focus on Choose another
  file.
- Repeat transfers kept by default, and counted, rather than silently merged.
- The Data panel's provenance line ("9,113 rows, one edge each; repeat pairs are not merged.
  Read Apr 2.") is something she would paste into a case.
