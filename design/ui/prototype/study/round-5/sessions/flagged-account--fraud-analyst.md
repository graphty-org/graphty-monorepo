# Session: a flagged account, clear or refer -- Sarah, level-2 fraud investigator

Participant: Sarah (persona: study/personas/fraud-analyst.md), eight years in financial crime,
now works only escalated cases. Mode: not mandated -- her own five minutes and one real task, but
she finished the task, so the patience limit never bit.

Task as given by the moderator: "An alert names account ACC-365386. Decide whether to clear it or
refer it, and save what you would attach as evidence."

Screens seen, in order (study view, 1440 x 900): the alert triage screens in
shots/tasks/flagged-account/ (01 open, 02 find, 03 Neighbors menu, 04 one hop, 05 the account's
own transfers, 06 the referred set with its note, 07 export, 08 the step menu, 09 "Where the data
is"), plus shots/alert-triage/case-path.png and case-export.png for how a case goes on after a
referral. HTML read only to see what the Neighbors menu and the step menu do.

## Think-aloud

**Opening screen (01).** "OK, a grey honeycomb with orange diamonds on it. The diamonds are
alerts, fifty of them, the little box says so. The honeycomb means nothing to me -- 2,950 accounts
drawn as 'density'. Fine, at least it's not a hairball. I don't care about the picture yet. Where
do I type the account number?"

She looks for a search box. There isn't one on screen; there's a magnifying glass next to
"Graphs" and another over the table. "The table is the alert queue, that's familiar -- alertId,
account, scenario, risk score. AL-40122, ACC-365386, 'Structuring: 3 or more transfers of
9,000...', risk 92. It's right there at the bottom, half cut off." She would click the row, or
Ctrl+F in the browser. On the mock the next frame shows the search filled in, so she takes it
that the magnifier next to Graphs opens it. "Tiny icon for the one thing everyone does first. I'd
have found the row in the table before the icon."

**Found it (02).** "Good: the right-hand side is the customer. Personal, US, risk 92, and it
tells me where the 92 came from -- the bank's own rating from the accounts file, 'not computed by
graphty'. I like that. I don't have to explain someone else's score. Alert time Aug 7 02:17,
scenario says three or more transfers of 9,000 to 9,999 out in 30 days. 8 neighbors, in 3, out 5."

"What's this black bar -- 'Delete step ACC-749505 and neighbors, Undo'? I didn't delete anything.
Did I just lose someone's work? I'm not pressing Undo on something I don't understand." She leaves
it alone and moves on, uneasy.

**The Neighbors menu (03).** "Hops from ACC-365386: 1 hop, 9 accounts. 2 hops, 283, 'mostly
through ACC-597001 (Pharmacy, 152 neighbors) and ACC-512219 (Streaming, 109)'. That is the first
genuinely useful thing on this screen. That's the answer to 'what happens with a payment
processor' -- it tells me before I blow the chart up, and it tells me why: a pharmacy and a
streaming service. Two hops is everybody who buys aspirin. I don't want that. One hop."
"'Follow: All' -- I'd guess that's in, out or both. I'd want 'out' later: where did it go next."
"'Filter to neighbors' versus 'Select neighbors' -- I don't know the difference and I don't care.
The big button said Neighbors, I press the big button."

**One hop (04).** Nine accounts. "Now we're talking. Five of the nine are orange -- five alerted
accounts around one alerted account. That is not a coincidence. And there's one account in the
middle everyone connects to, ACC-465572."

"But the lines have no arrows. I can't tell from the picture who paid whom. And no amounts on the
lines. The picture tells me 'these are connected', the table tells me the money. So I read the
table." The edge table is sorted by amount: 9,863.99, 9,815.97, 9,782.28, 9,707.38, 9,662.37,
9,616.35, 9,326.81. "Every one of those is just under ten thousand. Every one. And look where
they go: 274887 to 465572, 796219 to 465572, 898028 to 465572, 228299 to 465572. Everybody
around this account pays just-under-ten into the same account."

**The account's own transfers (05).** She selects ACC-365386 and the table narrows to its 8
transfers, in time order. "Aug 5, 3,479.70 in from 916833. Aug 6, three out in two and a half
hours: 9,260.78, 9,662.37, 9,139.58. Alert fires Aug 7 at 02:17. That's the rule working exactly
as written. Then Aug 17, 9,863.99 back in from 796219, Aug 24, 9,326.81 in from 228299 -- two of
the accounts it paid are paying back into it. Round-tripping, or at least money going round."

She does the arithmetic on the screen, because nothing on screen does it for her. "Out: 90.81,
9,260.78, 9,662.37, 9,139.58, 168.28 -- call it 28,321.82. In: 3,479.70, 9,863.99, 9,326.81 --
22,670.50. The in on Aug 5 doesn't fund the out on Aug 6 -- 3.5 thousand in, 28 thousand out the
next day. So either there was a balance, or cash went in and cash isn't in this file. Either way
I need the statement. That's the pivot table I'd normally run first: in versus out by counterparty.
It isn't here. The inspector says 'In 3, Out 5' -- counts. I need sums. I'll do that in Excel."

"Who is 465572? The note later calls it a money transfer business. I'd want to see that on the
account itself -- the table only showed 'merchant' in the set. For a referral, 'pays a money
service business' matters."

**Decision.** "Refer. Not close. Structured amounts out, just under the threshold, on the same
afternoon, to accounts that are themselves alerted for the same thing, which all cash out to one
money transfer account, and two of them pay back in. If I were L1 I'd be embarrassed to clear
this. If I were the L2 receiving it, I'd want exactly this referral."

**Refer it (06, 08).** "How do I refer in this thing? There's no Refer button, no disposition.
Honestly fine -- the disposition goes in the case system, not here. I just need this tool to keep
the boundary so I can pick it up." The mock shows a set called "Referred AL-40122, frozen, 9" and
a note. From the HTML, the set is made from the filter step's own menu: open the "Filtered: 9 of
3,000 nodes" chip, then the step's menu: Rename, Create rule set, Create set, Delete step.
"I would never have found that. It's behind the filter chip, then behind a right-click. And 'Create
rule set' next to 'Create set' -- what's the difference? I'd pick 'Create set' because it's
shorter. 'Frozen' -- I'll guess that means it won't change if the data changes. Good, if so."

"And whose note is this? 'Nadia, 10:27.' I didn't write that. If I'm doing the task I'd write my
own, but it's a decent note -- it has times and amounts. Except it says 'pass-through pattern',
and the amounts don't pass through: 3.5k in, 28k out. A QA reviewer would flag that sentence. The
tool didn't make that mistake, the analyst did, but the tool didn't help her not make it either --
a total in and total out next to the note would have."

"Where does this set live? The 'Where the data is' panel (09) says 'saved in this browser'. So the
L1 person refers it, and the set is in HER browser. I'm the L2. I'm not on her laptop. So what I
actually get is whatever file she exports. The set is for her, not for me."

**Evidence (07).** "Export. 'Findings report (.html)' and 'Table (.csv)', named
evidence-AL-40122.html and AL-40122-transfers.csv. Named by alert id -- good, my reviewer can match
it. The table of what's going in is shown before I write it: the 8 transfers with time and amount.
It tells me it names 9 accounts, 6 people, 3 merchants. And the footer: '2 files go to the download
folder. Nothing is uploaded.' That's the sentence IT wants to read."

"But the scope is wrong for a referral. It's the account's own 8 transfers. The reason I'm
referring is the other five -- the counterparties paying 465572. Those aren't in the CSV." She
reads the grey line under the scope: "Other scopes: ... the filter step ACC-365386 and neighbors
(9 nodes, 13 edges), the set Referred AL-40122." "Right, switch the drop-down to the filter step,
13 transfers. That's what I'd attach. I only saw that because I read the small print, and I read
small print because I read numbers. An L1 in month three won't."

"'Holds ... the current view as its figure.' So the picture is inside the HTML. I want the
picture as a PNG too, to paste into the narrative in Word. This dialog doesn't give me one. The
later case screen (case-export) has a 'Figure: PNG, 2x, legend drawn in' checkbox and a note that
it reads in grayscale because alerts are diamonds and the rest are circles -- that's exactly what
I need, and it's not on this dialog. Why does the L2 get a picture and the L1 doesn't?"

"I'd attach: the HTML report, the CSV of the 13 transfers in the one-hop step, and a screenshot
I'd crop myself in Paint because there's no PNG here. Plus my own in/out pivot from the CSV."

**The case after (case-path, case-export).** She glances at what happens after a referral. The
shortest-path screen says "Aug 4 13:56, earlier than the hop before" on one hop, and "Ignoring
direction, the shortest route is 2 hops ... It is not a flow from one to the other." "That's
honest. Most tools would draw me a money path that goes backwards in time and let me put it in a
SAR. This one tells me the hop is earlier. That's the kind of thing that saves me from an examiner."
The set statistics -- "transfers among 24, total among 226,756.28" -- "there's my total. On the
set. Why not on one account?"

## Decision reached

Refer. Evidence she would save: evidence-AL-40122.html and a CSV of the 13 transfers in the
"ACC-365386 and neighbors" step (after changing the export scope from the default 8), plus a
cropped screenshot of the one-hop chart, plus her own in/out pivot built in Excel from the CSV.

## Single Ease Question

**5 of 7.** "Getting to the money was quick -- search, one hop, table. The decision was obvious
once I saw five alerted neighbours all paying one money transfer account. Everything after the
decision -- making the set, choosing the right export scope, getting a picture out -- I had to dig
for or do somewhere else."

## Would she use this instead of her current tool?

"Instead of? No. Beside, yes -- if IT approves it, and 'nothing is uploaded, graphty runs in this
browser tab' is the first thing I'd forward to them. It doesn't replace the case system, Excel or
Word, and it shouldn't try. What it did that my pivot wouldn't: it showed me in one screen that
the counterparties are alerted too and all cash out to the same account. To get that in Excel I'd
have pulled five more statements. That's an hour saved on a case, and the 'mostly through the
pharmacy and the streaming service' warning before two hops is the first time a tool has
answered my 5,000-counterparty question before I asked it. But it gives me counts where I need
sums, lines without arrows, and a picture I can't get out as a picture, so I'm still rebuilding
parts of it in Excel and Paint for the reviewer. And the referral lives in one person's browser --
the handoff is a file, which is fine, as long as someone tells the L1 that the file IS the
handoff."

## Problems observed

1. **No arrows or amounts on the chart's links** (04, 05). Direction and money are only in the
   table; the picture cannot answer "who paid whom". Severity 3.
2. **The inspector gives counts, not sums, for one account** (02, 05): "In 3 . Out 5" but no total
   in and total out. She did the arithmetic by hand and planned an Excel pivot; the set view later
   has "total among", so the number exists, just not for one account. Severity 3.
3. **Default evidence scope leaves out the reason for the referral** (07): the account's own 8
   transfers, not the 13 in the step that show the counterparties paying ACC-465572. Found only by
   reading the grey "Other scopes" line. Severity 3.
4. **No PNG figure on the single-alert export** (07), though the case export offers one with a
   grayscale check. She would screenshot and crop. Severity 2.
5. **Making the referred set is buried** (08): filter chip, then the step's menu, then "Create
   set" beside an unexplained "Create rule set". She would not have found it unaided. Severity 2.
6. **A stray "Delete step ACC-749505 and neighbors, Undo" toast** on arriving at her account (02).
   She read it as possibly having deleted someone's work and did not dare touch Undo. Severity 2.
7. **The set and its note are "saved in this browser"** (09): the L1-to-L2 handoff can only be the
   exported file; nothing on screen says so. Severity 2.
8. **The search box is a small icon** (01); she would reach the account faster through the alert
   table row or browser Ctrl+F. Severity 1.
9. **The counterparty type (money transfer business) is not visible where she looks** (04, 05);
   it only appears in the note and as "merchant" in the set. Severity 2.

## What worked for her

- The hop menu stating sizes before anything changes, and naming the two hubs that make two hops
  explode (pharmacy, streaming).
- Provenance on every attribute: riskScore from the bank's file, "not computed by graphty"; the
  alert rule and time from the monitoring system's file.
- Alerted accounts as diamonds, others as circles: survives grayscale printing.
- Export names files by alert id, lists the rows before writing, counts people versus merchants,
  and says "Nothing is uploaded".
- The shortest-path screen flagging a hop that is earlier than the one before it, and saying the
  undirected route is not a flow.
