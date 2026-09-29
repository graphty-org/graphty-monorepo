# Session: load a messy export -- Sarah, fraud investigator

Participant: Sarah, level-2 financial crime investigator at a mid-size bank (simulated; persona in
study/personas/fraud-analyst.md). Mode: first impression, not mandated -- she gives it one real
task and about five minutes of goodwill.

Task as given: "Your bank's case system just exported March's transfers as a spreadsheet file.
Bring it in, and tell me whether what you are looking at is what you think it is."

Screens seen, in order: the Excel refusal (screens/load-transfers.html, state 3), the load step
for the CSV (state 1), the amount dropdown opened (state 2), the loaded project (state 4), then
the Data panel (screens/data-panel.html, state 1) and the frame at rest with the transfers
dataset (screens/frame-at-rest.html?dataset=transactions). For comparison she was also shown the
other load step mock (screens/load-step.html, state 1).

## Think-aloud

**1. The spreadsheet.**

"Our case system gives me an .xlsx. Always. So I drop the .xlsx in."

(Could not open transfers-2026-03.xlsx: Excel workbooks are not read.)

"Okay. Annoying, but at least it tells me exactly what to do -- File, Save As, CSV UTF-8. I do
that ten times a week for other things. And 'Nothing in graphty has changed', fine, I didn't
think it had. Choose another file."

"Question though: when Excel saves it as CSV, does it keep my account numbers as they are? If
there's an account number with leading zeros Excel eats them. That's not this tool's fault,
but it's the tool that'll show me the wrong accounts. I'd want it to read the xlsx itself and
skip that step."

**2. The load step.**

"Open transfers-2026-03.csv. Left side: format CSV, comma, header row. Source column
from_account, target column to_account. Fine, it guessed right. Id column 'None: ids are the
account names' -- they're not names, they're account numbers, but I get it, leave it."

"amount, read as Currency (USD), role Weight. timestamp, Date and time, role Time. Okay."

"Right side, Issues, two. 'amount is written as currency text. All 9,113 values carry a dollar
sign.' Yes, that's how the case system writes it. 'Read as Currency (USD): 9,113 weighted
edges.' Good -- it's already fixing it, I don't have to strip dollar signs. That's the thing I
hate doing in i2. I'll give it that."

"'412 extra parallel edges.' What's a parallel edge? ... 'Some pairs of accounts made more than
one transfer; 412 rows repeat a pair already read.' Oh -- repeat transfers between the same two
accounts. That's not an issue, that's the whole point. Structuring is repeat transfers between
the same two accounts. Why is that a yellow warning? 'Keep all: 9,113 edges.' Yes, obviously,
keep all. Don't you dare merge them."

"Sample, five rows. Account, account, amount, timestamp. $5.04, $8.97, $44.63... that looks like
my file. The amounts have a yellow stripe -- because of the dollar sign, I guess."

"What will load: 3,000 nodes, 9,113 edges, 0 rows dropped. 9,113 is my row count, I can check
that in the case system. Zero dropped, good. 3,000 'nodes' -- accounts, I assume. Exactly 3,000
is a suspiciously round number, but maybe the export caps it. I'd check."

"Now -- is this what I think it is? Two things I'd check in Excel before anything: what's the
total, and is it the whole month. I don't see a total anywhere. I don't see a date range
anywhere. The sample shows March 29, March 25, March 11... five rows, that tells me nothing
about whether February 28th leaked in or March 31st got cut off. And what time zone? The case
system is Eastern, the core is UTC, I've been burned on month-end before."

"Let me open the amount dropdown, maybe there's more."

(State 2: "Read as Currency (USD): 9,113 weighted edges -- "$1,240.00" becomes 1240. Total
$14,156,522.28. Every value kept." / "Keep as text: 9,113 unweighted edges.")

"There it is. Total $14,156,522.28. That's the number I'd tie out against the case system. Why
is it hiding inside a dropdown? I only found it because I was poking around. That should be
sitting next to '9,113 edges' under What will load, in big numbers. Rows and dollars -- that's
how I reconcile any export. Nobody on my team would open that dropdown, it already says the
right thing."

"And 'Keep as text' -- why would I ever want money as text? Fine, I won't pick it."

"Any negatives? Reversals, returns, chargebacks? The export sometimes has them as negative
amounts or as a separate status column. Nothing here tells me whether there were any. The min
and max would tell me. It doesn't say."

"'Filter at import...' -- I'm not filtering anything until I know what I've got. Load."

**3. Loaded.**

"A grey... honeycomb. That's not a link chart. Where are the transfers? I see hexagons, no lines,
no arrows. Is each hexagon an account? A bunch of accounts? There's a darker patch on the right --
is that something or just how it drew? No idea. Nothing on this screen tells me."

(On the frame-at-rest mock she later saw a note, "No labels: 3,000 accounts drawn as density".)
"Okay, that one at least says it's 3,000 accounts squashed together. The screen right after the
load didn't say that. It should have, that's when I'm staring at it wondering."

"Bottom: 'transfers-2026-03.csv read: 3,000 nodes, 9,113 edges. Undo.' Good that there's an
undo."

"Top left: 'Nothing has been sent from this project.' Good. That's the first thing IT will ask
me. Keep that."

"Right side, Statistics. nodes 3,000, edges 9,113, components 1, isolated 0. I don't know what a
component is. Density 0.00101 -- meaningless to me. Average total degree 6.08. Highest total
degree 907. Wait -- 907. One account touches 907 others? Or 907 transfers? That's my hub. That's
either a payroll account or a payment processor or my mule collector. WHICH ACCOUNT? It doesn't
say. It's just a number. I can't click it. That's the single most useful line on this panel and
it doesn't give me the account number."

"'Last import: 9,113 rows, 0 dropped.' Good, matches. '412 parallel edges, kept' with a yellow
mark again -- still telling me normal money movement is a problem."

"'Directed; amount, not used yet.' Directed, fine, from sends to to. 'amount, not used yet' --
it said Role: Weight on the load screen. Now it's not used. Which is it?"

"'For amount, a higher number means' -- Not answered. Dropdown: 'a closer or stronger link',
'a longer or costlier step', 'more can pass through', 'Don't use amount'. ... A higher amount
means more money moved. That's what it means. None of these say that. 'A stronger link'?
I guess? Two accounts that moved a lot of money are more connected, sure. 'More can pass
through' sounds like a pipe. 'A longer or costlier step' -- no. I'd pick 'a closer or stronger
link' and hope. Honestly I'd pick 'Don't use amount' because I don't know what I'm agreeing to.
What reads it? Nothing on this dropdown tells me what changes if I answer."

"And why is it asking me this now? I haven't asked for anything yet. I just want to look."

**4. Looking for the file facts (Data panel).**

"The Data tab. 'transfers-2026-03.csv, 9,113 rows, one edge each; repeat pairs are not merged.
Read Apr 2.' Okay, that's plain. from_account 'where each transfer starts', to_account 'where
each transfer ends' -- good, that's how I'd say it. amount 'numbers, USD'. 'Weight: amount, not
used yet. A run that can use it asks what a larger amount means.' So this panel says it'll ask
me later, and the other screen asked me right away. Pick one."

"Over on the right here it says 'accounts 3,000, transfers (rows) 9,113'. Accounts and
transfers! That's my language. Why does the Statistics panel say nodes and edges and this one
says accounts and transfers? Same numbers, two vocabularies. Use this one everywhere."

"Still no total amount. Still no date range. Still no 'the busiest account is ACC-whatever'."

**5. The other load mock.**

(Shown screens/load-step.html state 1 for comparison.)

"This one has 'timestamp: date, Mar 1 to Mar 31, UTC' right in the column header. That's it,
that's what I wanted. Why doesn't the one I used have that? And it has a Direction row with
from -> to spelled out. The one I used didn't show direction until after I loaded. I'd take this
header and the total from the dropdown, and put both on the same screen."

## Answer to the moderator

"Is it what I think it is? Mostly, probably. Row count matches, nothing dropped, the amounts
got read as money, direction is from-to. I found the dollar total, but only because I opened a
dropdown I had no reason to open. I can't tell you it's the whole of March, or what time zone,
or whether there are reversals in there, and the one number that looks interesting -- an account
with 907 connections -- doesn't tell me which account. So: I'd still open it in Excel and do a
pivot to confirm the total and the date range before I trusted anything in here."

## Single Ease Question

**4 of 7.** "Getting it in was easy -- easier than i2, it fixed the dollar signs itself, and the
refusal on the xlsx told me what to do. Knowing what I had in front of me was not easy. The
checks I actually run were either hidden or missing."

## Would she use this instead of her current tool?

"Instead of Excel? No. Excel tells me the total, the date range and the top counterparties in a
pivot in ten minutes, and my reviewer reads it. Instead of i2, for the few big cases? Maybe --
the import is much less painful than i2's import wizard, and 'nothing has been sent' matters to
me. But that honeycomb has to become accounts and transfers I can actually see, and it has to
tell me who the 907 is, before I'd put it in front of my manager."

## Problems observed

| Screen | What happened | Severity (1-4) |
|---|---|---|
| Load step, amount issue | The file's total ($14,156,522.28) is shown only inside the amount policy dropdown; she found it by accident and says nobody would open it. It is her primary reconciliation check. | 3 |
| Load step | No date range or time zone for timestamp; she cannot confirm the export covers exactly March. The other load step mock shows "Mar 1 to Mar 31, UTC" in the header. | 3 |
| Load step | No sign of negative amounts, reversals, min or max; she cannot rule out returns in the file. | 2 |
| Load step and Statistics | Repeat transfers between the same pair are flagged as a yellow warning ("extra parallel edges"); to her they are normal and often the evidence (structuring). "Parallel edge" is jargon. | 2 |
| Loaded, canvas | The first render is a grey honeycomb with no lines or arrows and no explanation; she does not know what a hexagon is or what the dark patch means. The explanation note exists on another screen but not right after load. | 3 |
| Loaded, Statistics | "Highest total degree 907" names no account and cannot be clicked; the hub she would investigate first is anonymous. | 3 |
| Loaded, Edges row | The weight question has no option that means "more money moved"; she would guess "a closer or stronger link" or skip it. It gives no hint of what answering changes. | 3 |
| Load step vs loaded | Role reads "Weight" in the load step, then "amount, not used yet" after load; she asks which is true. | 2 |
| Loaded vs Data panel | Statistics asks the weight question at once; the Data panel says a run will ask later. Two screens, two stories. | 2 |
| Statistics vs Data panel | Statistics says nodes/edges, the Data panel's overview says accounts/transfers (rows) for the same numbers. She prefers accounts/transfers. | 2 |
| Statistics | "components", "density", "average total degree" mean nothing to her. | 1 |
| Excel refusal | .xlsx is not read; she must round-trip through Excel, where leading zeros in account numbers can be lost. | 2 |
| Load step | "3,000" nodes is suspiciously round and nothing lets her confirm it (count of distinct senders vs receivers). | 1 |

## What worked for her

- The currency-text issue fixed itself by default with no stripping of dollar signs ("that's the
  thing I hate doing in i2").
- "rows dropped 0" and "Last import: 9,113 rows, 0 dropped" tie to her case system's row count.
- The .xlsx refusal names the exact Excel steps and says nothing changed.
- "Nothing has been sent from this project" at the top of the project.
- The Data panel's column glosses ("Where each transfer starts") and its accounts / transfers
  wording.
- Undo on the load notice.
