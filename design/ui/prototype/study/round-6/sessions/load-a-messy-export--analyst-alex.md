# Session: bring in a messy transfer export and say whether it is what you think -- Analyst Alex

Participant: Alex, data analyst on an operations analytics team at a logistics company. He computes
metrics in NetworkX and draws in Gephi. Before anything else he checks counts against a number he
already trusts, and he wants to know where company data goes before he loads it.

Task as given by the moderator: "Your bank's case system just exported March's transfers as a
spreadsheet file. Bring it in, and tell me whether what you are looking at is what you think it is."

Dataset: transfers-2026-03, 9,113 transfer rows (from_account, to_account, amount, timestamp)
between 3,000 accounts. Every amount is written as currency text ("$349.71"); 412 rows repeat an
account pair already seen.

Screens seen, in order, as a participant sees them (design notes hidden):

1. `shots/record/r6-alex-lme-transfers-not-read.png` -- the file as the case system saved it, an .xlsx,
   refused
2. `shots/record/r6-alex-lme-transfers-ready.png` -- the same data saved as CSV, the load step with two
   issues
3. `shots/record/r6-alex-lme-transfers-amount-policy.png` -- the amount issue's choices opened
4. `shots/record/r6-alex-lme-transfers-loaded.png` -- after Load: grey density picture, Statistics, the
   "a higher number means" question open
5. `shots/record/r6-alex-lme-frame-transactions.png` -- the same graph at rest, renamed "Transfers, March
   2026"
6. `shots/record/r6-alex-lme-data-panel.png` -- the Data panel on the same file
7. `shots/record/r6-alex-lme-load-step.png` -- another version of the load step on the same file (shown
   for comparison at the end)

## Think-aloud

**Before starting.**

"OK, so this is bank data, not my usual suppliers. Pretend I've been lent to the fraud team. First
thing -- same as always -- before I put transfer data from a case system into a web page I want to
know if it's going anywhere. I've got the start screen, 'Open a graph', a recent file called
February transfers, and Open. Nothing on this screen tells me where the file goes. Somebody used
this last month with February, so I guess it got approved? I don't know that. With bank account
data I'd honestly stop here and ask. For the session I'll carry on."

"And before I open it, I'd open the file in Excel myself. That gives me the thing I'll check
against: how many rows, and the sum of the amount column at the bottom of the window. I'll call
that 9,113 rows and whatever the total is. That's my SQL number for today."

**Screen 1 -- the .xlsx refused.**

"It said spreadsheet, so I drag the .xlsx in. 'Could not open transfers-2026-03.xlsx: Excel
workbooks are not read.' OK. At least it's clear, and it says 'Nothing in graphty has changed',
which is fine, nothing was there. Tells me exactly what to do: Save As, CSV UTF-8. Gephi takes
Excel files, for what that's worth. Mildly annoying, it's one extra step every month."

"But here's what actually worries me. When Excel saves a CSV it writes the cells the way they're
displayed. So the amounts come out with dollar signs and commas, and the dates come out in
whatever my Windows date format is -- 3/29/2026 9:09 PM or whatever. Account numbers with leading
zeros get eaten sometimes. So the tool is sending me through the exact step that messes the file
up. Fine, I'll do it."

Clicks Choose another file..., picks the CSV.

**Screen 2 -- the load step with two issues.**

"Right. Left side: format CSV comma header row, source from_account, target to_account. Good, it
guessed those right. Id column 'None: ids are the account names' -- fine. amount has a yellow
warning, read as Currency USD, role Weight. timestamp read as Date and time, role Time."

"Right side, Issues 2. 'amount is written as currency text' -- yeah, told you, that's Excel. 'All
9,113 values carry a dollar sign.' It's going to read it as currency, 9,113 weighted edges. OK.
Second one, '412 extra parallel edges. Some pairs of accounts made more than one transfer.' Keep
all, 9,113 edges. Good -- for transfers I want every transfer, I don't want it adding them up behind
my back. I'd want to know what the other option is though. I'd click that dropdown just to see."

"Sample, first 5 of 9,113 rows. The amount column has a yellow bar, 'as written', $5.04 and so on.
The timestamps look like proper ISO dates here, 2026-03-29 21:09:09, so I guess my Excel didn't
wreck them this time. No time zone though. The bank's system is probably UTC and I'm not. For a
'what happened on the 31st' question that matters. Nothing here says which it assumed."

"What will load: nodes 3,000, edges 9,113, rows dropped 0. OK, that's the bit I actually came for.
9,113 matches Excel. Zero dropped. 3,000 accounts -- I don't have a number to check that against,
I'd have to do a distinct count on both columns in Excel. Plausible."

"What I don't see: is it actually March? Does it start March 1 and end March 31? 'March's
transfers' is the whole question and nothing on this screen gives me the first and last date.
That's the first thing I'd check if I'd written the SQL myself. A case system export could be
cut at the 30th or have a few April rows in it and this would load it just the same."

"Also still nothing here about where the file's going. This would be the moment."

**Screen 3 -- the amount choices.**

"Clicking the currency one. 'Read as Currency (USD): 9,113 weighted edges. "$1,240.00" becomes
1240. Total $14,156,522.28. Every value kept.' Oh -- that's useful. That's the number I'd compare
to the sum in Excel. If those two match I trust the amount column. But it's hidden inside a
dropdown -- I only saw it because I went poking. It should be sitting next to 'edges 9,113' in
'What will load'. That's a count I check every time."

"Other option, 'Keep as text: 9,113 unweighted edges, measures that use weights treat every
transfer as equal.' No, I want the numbers. Currency it is. Default was right, so I didn't need to
touch this, which is how it should be."

Clicks Load. "One click after the file. Fine."

**Screen 4 -- after Load.**

"Grey blob. Well, a hexagon density thing, 'No labels: 3,000 accounts drawn as density' on the
other version. OK, at least it's not pretending to be a picture. I'm not looking at it anyway."

"Toast at the bottom: 'transfers-2026-03.csv read: 3,000 nodes, 9,113 edges' with Undo. Good."

"Statistics on the right. nodes 3,000, edges 9,113, components 1, isolated 0. Density 0.00101,
average total degree 6.08. Highest total degree 907."

"Hang on. 907. Out of 3,000 accounts, one account is on 907 transfers? That's about a tenth of
everything. Either that's a bank's own clearing or suspense account and it'll dominate every
centrality number I run, or it's the actual thing the case is about. Either way, that's the most
important line on the screen and I can't click it. I want to know which account that is. In
NetworkX that's one line, sorted degree, head. Here I'd have to go hunting."

"And components 1 with zero isolated -- on a bank export? Everybody connected to everybody in one
piece? That could be real, but it's also exactly what you'd get if everything goes through that
907 account. I'd want to see what's left if I take it out. Not today."

"'Last import: 9,113 rows, 0 dropped.' Good, it kept the check. '412 parallel edges, kept.' Good.
'Directed; amount, not used yet.' ... Not used yet? I set its role to Weight on the last screen.
The dropdown said Weight. Now it says not used. So what did 'Weight' do? This is the kind of thing
where I end up telling my manager the betweenness is weighted by amount and it wasn't."

"'For amount, a higher number means' -- Not answered. The options: 'a closer or stronger link --
similarity', 'a longer or costlier step -- distance', 'more can pass through -- capacity', 'Don't
use amount'. Hmm. It's money moving. A bigger transfer is... a stronger link, I suppose? Two
accounts that sent a lot are more connected. But 'more can pass through' sounds like money too.
I genuinely don't know which one betweenness wants for this. I'd pick 'closer or stronger link'
and I'd be about sixty percent sure. Honestly I'd pick Don't use amount for now, because at least
I know what that means, and come back to it."

"And '4 attributes'. Which four? From, to, amount, timestamp, I guess, but from and to aren't
attributes, they're the ends. So that's two plus... I'd click it to find out."

"Top left: 'Nothing has been sent from this project.' OK -- there it is. And 'Assistant Off.
Nothing is sent.' That's what I wanted to read, but I wanted to read it before I loaded the bank's
data, not after. After is a bit late."

**Screen 5 -- the same graph at rest.**

"Different wording on this one. 'Loaded: transfers-2026-03.csv, direction followed, amount not used
yet.' Nodes 3,000 nodes, Edges 9,113 edges (rows). Linked pairs 9,113 linked pairs."

"Wait. Linked pairs 9,113? The last screen said 412 of those rows repeat a pair. So there should be
9,113 minus 412, 8,701 pairs. Either 'linked pairs' means something I don't get, or one of these
two numbers is wrong. This is exactly what makes me not trust a tool -- two screens, same file,
numbers that don't agree. I'd take this to Python to find out which one's right."

"Attributes 9, 5 more. Earlier it was 4 attributes. Same file. Nine what? Maybe it computed some?"

"There's also a little histogram, total degree distribution, all squashed to the left with a long
tail. That tail's my 907 account. Can't hover it in a picture but I get the idea."

**Screen 6 -- the Data panel.**

"Sources: transfers-2026-03.csv, '9,113 rows, one edge each; repeat pairs are not merged. Read Apr
2.' Good, that says it plainly. Columns: from_account 'where each transfer starts', to_account
'where each transfer ends', amount 'numbers, USD', timestamp 'date and time'. That's a nice little
data dictionary actually. amount: 'Weight: amount, not used yet. A run that can use it asks what a
larger amount means.' OK, so this one explains the 'not used yet' -- it'll ask me when I run
something. Would've been nice to see that sentence on the load screen instead of a Role box that
said Weight."

"Still no date range on timestamp. 'Date and time.' I want 'March 1 to March 31'. Right there,
under the column name, would do it."

"Versions, 'March data, current'. Update with new data... -- so next month I'd drop April in here
and not redo the mapping. That's the bit I'd actually care about long term."

**Screen 7 -- the other load step, shown for comparison.**

"Oh, this one has 'date, Mar 1 to Mar 31, UTC' in the timestamp header. That's the thing I was
asking for. And a Direction row, 'Directed (from -> to)', and 'Weight: amount, not used yet' right
under the counts, and role None instead of Weight. This one's more honest about the weight. But it
has no Issues section at all -- I'd assume that means nothing's wrong, and it doesn't mention the
repeat pairs or that the amounts had dollar signs. If I got this one I wouldn't know about the 412.
I'd take the date range and the weight line from this one and the issues from the first one."

## Answer to the moderator

"Is it what I think it is? Mostly yes. 9,113 transfers, none dropped, amounts read as numbers,
412 repeat pairs kept as separate transfers. That matches Excel. What I can't tell you from the
screens: whether it's all of March and only March -- no first and last date anywhere I loaded it
-- and what the total dollar amount is, unless I go poking inside a dropdown. And one account sits
on 907 of the transfers, which is either the answer or a bank account that's going to wreck every
measure, and I can't see which account it is. Plus two screens disagree on how many account pairs
there are. So: the rows are right, I'm not yet sure the picture of the data is."

## Single Ease Question

**5 out of 7.** Getting it in was easy -- once I had a CSV it was one click, the defaults were
right, and the counts were in front of me before I committed. What took longest was the .xlsx
round trip and then puzzling over whether amount was a weight or not: the load screen said Weight,
the next said not used, and the question it asked me -- similarity, distance or capacity -- I
couldn't answer for money. And the linked pairs number made me stop.

## Would I use this instead of what I use now?

"For the check-the-data part, honestly, maybe yes. Gephi's import report is worse than this --
it doesn't tell me about the currency column, it just quietly reads it as a string and I find out
later when the sizing doesn't work. This told me up front, gave me the counts before I clicked
Load, and kept the import check on the screen afterwards. The Update with new data thing is the
Gephi-half-every-month problem, if it works."

"But: I'd still do the first pass in pandas. Min and max of timestamp, sum of amount, top ten by
degree -- three lines, and I'd have the three things this didn't show me. And with bank data I'm not
loading anything until I've seen, on the load screen, that it doesn't leave my machine, and I've
asked someone. The 'nothing has been sent' line is there, it's just in the wrong place for me."

## Problems observed

1. No statement at the point of loading that the file stays on this machine; "Nothing has been sent
   from this project" appears only after Load. With bank account data this is where he stops.
2. The load step shows no date range for the timestamp column, so "is this all of March?" cannot be
   answered. The other load-step version shows "Mar 1 to Mar 31, UTC"; the transfer version shows
   neither the range nor the time zone.
3. The amount total ($14,156,522.28), the one figure he would reconcile against Excel, is visible
   only inside the policy dropdown, not in "What will load".
4. Role reads "Weight" in the load step, then "amount, not used yet" after Load. He concluded the
   Weight setting did nothing and worried he would report a weighted result that was not.
5. "For amount, a higher number means" -- similarity, distance or capacity -- he could not answer
   for money transfers; he would fall back to "Don't use amount".
6. "Linked pairs 9,113" on the Statistics at rest contradicts "412 extra parallel edges" (he expected
   8,701). He would leave the tool to find out which is right.
7. Attribute count differs between screens ("4 attributes" after Load, "Attributes 9" at rest) with
   no way to tell what is counted.
8. "Highest total degree 907" is the most telling number on the screen and is not clickable; he
   cannot see which account it is.
9. The .xlsx refusal sends him through Excel's Save As, the step most likely to mangle amounts, dates
   and ids; he notes Gephi reads Excel directly.
10. The other load-step version has no Issues section; he read the absence as "nothing wrong" and
    would not have learned about the 412 repeated pairs or the currency text.
