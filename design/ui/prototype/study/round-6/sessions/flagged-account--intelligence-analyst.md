# Session: flagged account -- intelligence analyst (Marcus)

Participant: Marcus, criminal intelligence analyst at a state fusion center
(study/personas/intelligence-analyst.md). Works phone records, bank subpoena returns and jail
calls into link charts for case agents and prosecutors. Not a bank reviewer; he reads bank
returns when a subpoena comes back, and he is the one who gets cross-examined on them.

Task as given: "An alert names account ACC-365386. Decide whether to clear it or refer it, and
save what you would attach as evidence."

Material worked from, as the participant sees it (study view, 1440 x 900), in this order:

- the alert-triage screens on August's alerts: the project as it opens, the account found by
  search, the Neighbors menu with hop sizes, one hop filtered, the account's own transfers with
  the Export menu, the referred set with its note, the evidence export dialog, the filter steps
  with Delete step, and "Where the data is"
  (shots/tasks/flagged-account/01-alert-triage-open.png through 09-alert-triage-file.png)
- the inspector page's flagged-account state, looked at afterwards because the same account
  number is on it (screens/inspector.html#flagged)

## Think-aloud

**1. The project opens (01).**

"August alerts. There's a grey honeycomb in the middle with orange diamonds on it. That's the
meatball -- I don't read anything off that. 'Narrow the graph' in the corner, fine, later.

What I actually read is the table underneath: alertId, account, kind, scenario, risk score.
That's a queue. Sorted by alertId, 'the order the monitoring system raised them.' Good, that's
how the bank would hand it to me. There's my account, bottom row: AL-40122, ACC-365386,
personal, 'Structuring: 3 or more transfers of 9,000...', score 92, 8 links. The scenario's cut
off, but I know what structuring is.

Top left says 'Nothing has been sent from this project' and the rail says 'Assistant: Off.
Nothing is sent.' First thing I check with any web tool. I'll come back to it."

**2. Find the account (02).**

"I type the account number in the search. One hit: 'personal, US; in Alerts'. Clicked. It's
circled on the honeycomb and the right side fills in.

Right side, reading carefully: riskScore 92, 'From accounts-2026-08.csv. riskScore is the
bank's customer risk rating as delivered; not computed by graphty.' That's the right answer.
If somebody asks me on the stand where 92 came from, it's the bank's number, not the tool's.
Same for the alert: AL-40122, the scenario in full now, Aug 7 02:17 UTC, from the alerts file.

8 neighbors. 3 links in, 5 out. Money in 22,670.50, money out 28,321.82, 'Sum of amount over
its transfers.' So more went out than came in. Noted.

02:17 UTC -- that's evening the day before, my time. I'll have to convert that when I write it
up. Every tool does UTC. Fine."

**3. How far out (03).**

"There's a Neighbors button with an arrow. The arrow gives me hop sizes before I commit: 1 hop,
9 accounts, 13 transfers. 2 hops, 283. And it tells me why 2 hops blows up -- 'mostly through
ACC-597001, Pharmacy, 152 neighbors, and ACC-512219, Streaming, 109.' That's exactly the thing
I'd waste twenty minutes finding out myself. A pharmacy isn't a co-conspirator, it's everybody's
pharmacy. One hop it is.

'Filter to neighbors' or 'Select neighbors'. Blue one's Filter. I want the thirty people around
this guy -- nine, here -- and nothing else on screen, so Filter."

**4. One hop (04).**

"Now it's a chart. Nine accounts. Five orange diamonds, four grey dots. The little box says
orange diamond is 'alert is true', 5. So four of his eight counterparties are themselves
alerted. That already doesn't look like a guy paying his rent.

The black box says 'Filter to ACC-365386 and neighbors: 9 nodes. Undo.' Good -- I know what I
just did and I can back out.

What I don't have on the chart: which way the money went and how much. The lines are plain grey
lines. No arrowheads, no '9,662.37, Aug 6' on the link. In i2 that label is on the line; here I
have to go to the table. And the grey dots -- which of those is a merchant and which is a
person? ACC-597001 I only know is the pharmacy because the menu told me a second ago. The
diamond helps on the black-and-white printer at least; orange won't survive that, the shape will.

The table dropped to Edges, 13 of them, sorted by amount. Lots of 9,600s, 9,700s, 9,800s. And
most of them are going into ACC-465572, not into my guy."

**5. His own transfers, in time order (05).**

"I click my account and the table follows it: 'Edges of the selection, ACC-365386: 8 of 13.
Sorted by time.' Good, time is what I want.

Aug 3, 90.81 out -- nothing. Aug 5 09:09, 3,479.70 in from ACC-916833. Then Aug 6: 15:21,
9,260.78 out to 274887. 15:44, 9,662.37 out to 898028. 17:42, 9,139.58 out to 465572. Three
under-ten transfers in two and a half hours, three different receivers. That's the rule, and it
fired the next morning. Then Aug 17, 9,863.99 back in from 796219. Aug 24, 9,326.81 in from
228299. Both alerted accounts. Aug 30, 168.28 to the streaming service -- nothing.

New since last time: the footer adds it up for me. 'Money in 22,670.50 USD (3 transfers).
Money out 28,321.82 USD (5 transfers).' I don't have to sum a column by hand. Good. But it
still doesn't say anything about the obvious question -- 28 thousand out on 3.5 thousand of
known money in before the 6th. Where did the rest come from? The file can't know his opening
balance or cash deposits, and nothing on the screen says so. I'd know. A new reviewer might
not.

And the Export plus at the bottom of the right side offers 'Export the selection's edges... 8
transfers: time and amount.' Hold that."

**6. Decision, in my head.**

"Refer. Not close. Structuring out on the 6th, three receivers, two of the receivers plus two
other alerted personal accounts all paying ACC-465572 just under ten grand each -- I don't
know yet what 465572 is, a grey dot, I'll have to click it -- and money coming back in from the same
circle afterwards. That's a collection point with people feeding it. Pass-through. It goes to
an investigator."

**7. Refer it (06, and 08 for where it lives).**

"Now, how do I refer it? I look for a Refer button. Escalate. Case. There isn't one. There's
'Quick actions' on the bottom bar -- I'd try that next and type 'refer', and I don't know
if that finds anything. There's a plus next to 'Sets and paths' on the left. I'd guess that.

What the screens show is that the nine accounts got saved as a set, 'Referred AL-40122,
frozen, 9', with a note on it, and 'Add note / Undo' on the chart. The note came from the
filter's own menu -- I only see that menu two screens later, when the 'Filtered: 9 of 3,000'
chip opens it: Rename, Create rule set, Create set, Delete step. 'Create set' off a filter chip
is not where I would look for 'refer this to an investigator'. I'd have gotten there
eventually, by clicking everything. Not in my first minute.

'Frozen' -- I take it that means it won't change if the data changes. That's what I want for
something I'm referring. It'd be nice if it said so.

The members list says 'ACC-365386 alerted, ACC-274887 alerted, ACC-898028 alerted, ACC-465572
merchant, 5 more.' Merchant, not 'money transfer service'. The note says money transfer. One of
them's wrong or they mean different things.

The note itself is the write-up I'd have written: in 3,479.70 Aug 5, out the next day 15:21 to
17:42, the three amounts, alerted Aug 7, later in from 796219 and 228299, all four personal
counterparties alerted and all pay 465572, pass-through. Author and time stamped on it. That's
what I want on a case note.

Except it's signed 'Nadia, 10:27.' Who's Nadia? I'm the one doing this. If I'm picking up
somebody else's work I need to know that, and if I wrote it, it needs my name. On a case
file, the name on a note is not decoration."

**8. The evidence (07).**

"I select the account again and hit 'Export the selection's edges.' Dialog.

Findings report, HTML, and a table, CSV. Both ticked. Scope: 'The selection's edges:
ACC-365386, 8 transfers.' It lists the eight right there before it writes anything. I like that
-- I see exactly what goes out.

'holds: her note (on the set Referred AL-40122...); these transfers with time and amount; the
account's attributes, each with the file it came from; the current view as its figure;
methods: the filter step, then the selection's edges.' That's sourcing. Each attribute with
the file it came from. That's how I'd want to hand it to a prosecutor.

'Her note.' Again. Not my note.

The scope. Eight transfers is his side only. The reason I'm referring it is the other side --
the four alerted accounts paying 465572. Those payments aren't in the eight. The grey line
under the box says there are other scopes: 'the filter step (9 nodes, 13 edges), the set
Referred AL-40122 (9 nodes).' I'd open the dropdown and pick the set. It worked out because I
read the grey line. A reviewer in a hurry sends the eight and the investigator asks where the
rest is.

The CSV: columns source, target, time (UTC), amount (USD). No transaction reference. When
defense asks 'which record is this line', I need the bank's transaction ID or at least the row
number in transfers-2026-08.csv. The file name is on the report; the row isn't. I'd add the
references by hand from the bank return before this goes anywhere. That's the same complaint
I'd make about every line on a chart: where did it come from, exactly.

'2 files go to the download folder. Nothing is uploaded.' Export 2 files. Done."

**9. Done with it (08).**

"Filter chip opens the filter steps. Under the step: 'Kept from this step: set Referred
AL-40122, 1 note. Evidence exported 10:31.' So if I delete the filter I don't lose the set or
the note, and it tells me the evidence went out. That's the reassurance I need before I delete
anything. Delete step. Nothing on the menu says whether I can undo it, but the last two things I did had an Undo, so I'd risk it."

**10. Did anything leave the building (09)?**

"'Where the data is.' Read every word. Data: transfers-2026-08.csv, 'read from this computer at
08:41. graphty runs in this browser tab and has no server of its own.' Uploaded: nothing.
Saved: 'in this browser, 10:33.' Written out: 4 files, evidence for AL-40121 and AL-40122, with
the names. Assistant off; if on, 'it sends each question and the rows it reads to the chosen
provider.'

That's the page I screenshot and send to IT. Two worries. 'Saved in this browser' -- our IT
wipes browser data on some machines. If this project lives in the browser, where's my case on
Monday? And 'no server of its own' -- but I opened it from a web address. Whose? IT will ask
that before they read anything else.

And there's a 'Referred AL-40122' in the list, but nothing on the alert queue itself tells me
AL-40122 is done. If I work 20 of 50 today, how do I see which 30 are left? The queue doesn't
carry a status."

**11. Same account, other screen (inspector page).**

"Somebody showed me the same account number on another screen. 'Transfers, March 2026',
accounts-2026-03.csv. Different month -- that's labelled now, so I get why the numbers differ:
money in 19,449.22 there, 22,670.50 here. But country GB there, US here. Same account number,
different country in two months of the same bank's file? That's either a data problem or a
different account. I'd ask the bank. Not the tool's fault, but I'd flag it. And the money's
written '$19,449.22' there and '22,670.50 USD' here -- pick one."

**12. Decision.**

"Refer. Structuring out on Aug 6 -- three transfers of 9,139.58 to 9,662.37 in about two and a
half hours, to three receivers, on 3,479.70 of known money in -- and four alerted personal
accounts, including two of his receivers, each paying ACC-465572 just under ten thousand. Money
comes back to him from the same circle on the 17th and 24th. Open questions for the bank: the
source of the rest of the 28 thousand, and what ACC-465572 actually is.

Evidence I'd attach: the findings report with the scope switched to the set Referred AL-40122
(9 accounts), the CSV of the same, and a screenshot of 'Where the data is'. Transaction
references added by hand from the bank return."

## Single Ease Question

**5 of 7.** "The looking was easy -- easier than last time, because the footer does the
adding and the filter tells me what I kept before I delete it. Search, one hop, sort by time,
and the pattern is right there. The two-hop warning about the pharmacy is still the best thing
on the screen. What costs me is the keeping: no Refer button, the set comes out of a filter
menu, the note is signed by somebody who isn't me, the export starts on the smallest scope,
and no line carries a transaction reference."

## Would he use this instead of his current tool?

"Not instead. Alongside, for bank returns. For an account and its counterparties with money in
time order, it's faster than Excel plus i2 and it tells me where each number came from, which
neither of those does. And a page that lists every file it wrote and says nothing was uploaded
is how it gets past IT -- as long as somebody can tell IT who hosts the web address and my
project survives the browser getting wiped. It's not replacing i2 for anything a prosecutor
sees: every account is the same dot, a money service looks like a pharmacy, lines have no
arrows or amounts on them, no grade, no transaction reference, and the guy down the hall who
only has i2 can't open it."

## Problems observed

1. **No transaction reference on a transfer.** The table, the CSV and the findings report carry
   source, target, time and amount and name the file, but not the bank's transaction ID or the
   row in the file. He cannot answer "which record is this line" in discovery and would add
   references by hand. Severity: high for his work.
2. **Refer has no visible route.** The referral is a frozen set made from the filter chip's
   step menu (Create set). He looked for Refer or Escalate, would try Quick actions and the +
   by "Sets and paths", and would not have found the step menu in his first minute. There is no
   Clear either, and the alert queue shows no status for an alert that has been worked.
   Severity: medium.
3. **The note is signed by someone else.** "Nadia, 10:27" on the note and "her note" in the
   export. He cannot tell whether he is continuing another reviewer's work; a case note must
   carry the right name. Severity: medium.
4. **Export starts on the narrowest scope.** "The selection's edges" (8 transfers) leaves out
   the counterparties' payments into ACC-465572, which is the substance of the referral. The
   set scope is in the dropdown and one grey line; he found it by reading, a hurried reviewer
   would not. Severity: medium.
5. **The chart does not say what anything is or which way money went.** Person, merchant and
   money service are the same grey dot; links have no arrowheads and no amount or date label,
   so the story is only in the table. Severity: medium (his standing i2 complaint).
6. **"Merchant" and "money transfer" disagree.** The set's member list calls ACC-465572
   "merchant"; the note calls it a money transfer service. He would not know which to repeat.
   Severity: low.
7. **Nothing warns that the file cannot show the whole balance.** The footer totals in and out
   (an improvement), but 28 thousand out on 3.5 thousand of known inflow passes without a hint
   that opening balance and cash are out of view. Severity: low.
8. **Where the project is kept, and who hosts the page.** "Saved in this browser" worries him
   on machines IT wipes; "no server of its own" leaves open whose web address he opened.
   Both are the first questions IT will ask. Severity: low for the task, high for adoption.
9. **The same account differs across months with no explanation.** March says GB and
   "$19,449.22"; August says US and "22,670.50 USD". The month is now labelled, so he reads it as
   two files, but the country change and the two money formats would still make him stop and
   ask. Severity: low.
10. **Times only in UTC; "frozen" and Filter vs Select unexplained.** A 02:17 UTC alert is the
    previous evening locally. He guessed "frozen" means unchanging and took the blue default.
    Severity: low.
