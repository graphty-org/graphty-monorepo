# Session: a flagged account, clear or refer -- Priya, threat hunter

Participant: Priya (persona: study/personas/cybersecurity-analyst.md), senior threat hunter in a
bank SOC who covers the alert queue when someone is out. Her home ground is Splunk, Defender and
a Jupyter notebook. This alert is a money-laundering scenario, not an intrusion, so she is working
the fraud team's queue on loan. She says so once and gets on with it.

Task as given by the moderator: "An alert names account ACC-365386. Decide whether to clear it or
refer it, and save what you would attach as evidence."

Screens seen, in order (study view, 1440 x 900, rendered fresh with kit/shoot.mjs --tasks
flagged-account): shots/tasks/flagged-account/ 01 the project opens, 02 find the account, 03 the
Neighbors menu, 04 one hop, 05 the account's own transfers, 06 the referred set with its note,
07 the export dialog, 08 the filter step's menu, 09 "Where the data is". HTML of
screens/alert-triage.html read only to see what the Export "+" and the step menu do when clicked.
She also clicked (in her head) two of the orange diamonds; their attributes are taken from the
same data the page draws.

## Think-aloud

**Opening (01).** "OK. Grey blob, orange diamonds, table underneath. The table is the thing I
actually want. 'Rule set Alerts: 50 of 3,000 nodes. Sorted by alertId, the order the monitoring
system raised them.' Fine, that's a queue. Row AL-40122 is at the bottom, ACC-365386, riskScore
92, structuring. That's my one. Highest score on the screen, for what that's worth."

"Left rail: 'Assistant. Off. Nothing is sent.' And up top, 'Nothing has been sent from this
project.' Good. That's the first thing I'd ask. I'd still want it in writing from whoever
approved this, but at least the app isn't hiding it."

"I don't care about the honeycomb. '2,950 nodes drawn as density.' Sure. Skip."

**Find (02).** "I typed the account id into the search box. One hit, 'personal, US; in Alerts'.
Click it. Right panel fills in." She reads it top to bottom, slowly. "riskScore 92, and it tells
me it came from accounts-2026-08.csv and graphty didn't compute it. Good, that's the question my
lead asks. Alert scenario: structuring, three or more transfers of 9,000 to 9,999 out in 30 days.
Alert time Aug 7 02:17 UTC. UTC, thank you. Eight neighbours, three in, five out. Money in 22.6k,
money out 28.3k."

"Hang on. Out is more than in. Keep that in mind."

**How far to look (03).** "'Neighbors' button with a caret. Caret opens... sizes before I commit.
One hop, 9 nodes. Two hops, 283, mostly through a pharmacy and a streaming service. Three hops,
two thousand. OK, this is the thing Sentinel never did for me -- it tells me two hops is going to
be junk because of two merchants, before I click. That's actually useful."

"'From: Any time.' There's a time filter on the hop. Good. 'Filter to neighbors, 1 hop, Shift+N.'
A key. I'll take the key. I'd rather type 'neighbors(ACC-365386, 1)' but a key is second best."

**One hop (04).** "Nine accounts, five diamonds. So four of its eight neighbours are also
alerted. That's not nothing. 'Filter to ACC-365386 and neighbors: 9 nodes. Undo.' Nice, it says
what it did and gives me the way back. And the chip up top says 'Filtered: 9 of 3,000'. I know
I'm looking at a slice."

"Table switched to Edges on its own, sorted by amount. Most of these are 9,6-, 9,7-, 9,8-
thousand. Everything's under ten grand. Everything."

**The account's own transfers (05).** "I want only this account's rows, in time order. I clicked
the account and sorted by time. 'Edges of the selection, ACC-365386: 8 of 13.' Good, the header
tells me it switched scope, I didn't have to guess."

She reads the rows aloud. "Aug 3, 90 bucks to a pharmacy. Aug 5, 3,479.70 in from 916833. Aug 6,
three out in two and a half hours: 9,260, 9,662, 9,139. That's the rule, right there, three
in-band in one afternoon. Alert fires Aug 7, 02:17. Then Aug 17 and Aug 24, two more nine-
thousand-somethings come IN, from two of the other alerted accounts. Aug 30, 168 to streaming."

"Footer: Money in 22,670.50, 3 transfers. Money out 28,321.82, 5 transfers. OK, now the thing
that bugged me. On Aug 6 it sends out about twenty-eight thousand. Before Aug 6, the only money in
this file coming in is 3,479. So where did the other twenty-four grand come from? Cash? A July
deposit? Not in this file. This file is August. The rule looks back 30 days from Aug 7, that's
back to July 8. I can't see July. Nothing on the screen says 'your data starts Aug 1', I only know
because the file is called transfers-2026-08."

"That doesn't change my call. It makes it stronger if anything -- money showed up from
somewhere I can't see and left in three pieces under ten grand. But if I write 'pass-through' and
someone opens July and it's a salary, I look stupid."

She clicks two of the diamonds in her head. "274887: GB, structuring, alerted Aug 20. 796219: BR,
structuring. Cross-border, all hitting the same rule, and they all pay 465572, which is a money
transfer business. That's a ring, or it's the monitoring rule being dumb about one remittance
shop. Either way it's not mine to clear."

**Decision: refer.** "Refer. Four structuring alerts around one money-transfer merchant, three
in-band transfers in an afternoon, and funding I can't see. Nobody clears that at tier 1."

**How do I say 'refer' in this thing? (06, 08).** "Where's the Refer button? There isn't one.
Clear, Refer, Escalate -- nothing. OK. Honestly, the disposition goes in the case system anyway,
not in a graph tool, so I'm not upset. But the task says save it, so what's the save."

She looks around. "Plus next to 'Sets and paths'? That makes an empty set, I'd guess. The chip
'Filtered: 9 of 3,000' -- open it, there's the step, and its menu has 'Create set'. That's what I
want: freeze these nine as 'Referred AL-40122'. I only found it because I opened the chip to see
what the filter was. First I tried the account's '...' menu in the right panel. If I'm on hour
ten of a shift, I don't find it, I screenshot the graph and paste it in the ticket."

"After I make it, 'Frozen set, 9, Created from filter step ACC-365386 and neighbors.' Good,
provenance. Toast says 'Add note'. There's a note already on it signed 'Nadia, 10:27'. Who's
Nadia? Did someone else already work this? If this is the tool showing me my own note, it should
say my name. I'll assume in real life it's mine."

She reads the note. "'Pass-through pattern.' No. I'd write 'out exceeds in; Aug 6 outflow funded
from outside this file (July not loaded)'. Pass-through is a conclusion, I don't have the July
data to earn it. And 'money transfer ACC-465572' -- the members list calls it 'merchant'. Fine,
it's a money transfer merchant. Consistent enough."

**Evidence (07).** "Export plus on the account, 'Export the selection's edges, 8 transfers: time
and amount.' Dialog. Findings report HTML and a CSV, both ticked. The eight rows are right there
in the dialog before anything is written. Good, I can see what I'm attaching. 'Two files go to
the download folder. Nothing is uploaded.' That's the sentence I wanted."

"'holds: her note... these transfers... the account's attributes, each with the file it came
from... methods: the filter step, then the selection's edges.' That's close to my notebook. It
writes down how I got here. I like that more than the picture."

"But the scope. Default is this account's 8 transfers. The reason I'm referring is the other 5
edges -- the four alerted accounts all paying 465572. Those aren't in the 8. I'd switch Scope to
'the filter step ACC-365386 and neighbors, 9 nodes, 13 edges'. The dropdown lists it, so I can.
But if I'd just hit Export, the CSV my lead opens doesn't show the ring."

"What it doesn't say: the time range. 'transfers-2026-08.csv' is in there, but not 'data covers
Aug 1 to Aug 31, rule window starts July 8, not loaded'. If it's not in the report, my lead asks.
And the figure -- 'the current view as its figure'. Does it have the legend? The diamonds mean
'alert is true' only if the legend comes along. I'd have to open the file to find out."

She exports with the scope switched to the filter step. "evidence-AL-40122.html and
AL-40122-transfers.csv. Fine."

**Done with it (08).** "Filter steps panel: 'Kept from this step: set Referred AL-40122, 1 note.
Evidence exported 10:31.' Then Delete step. I like that it tells me what I'd lose before I delete
it -- nothing, because I kept it. That's the BloodHound thing I never got: what did I actually
save."

**Did anything leave (09).** "'Where the data is': read from this computer, uploaded nothing,
written out 4 files, the names listed. Assistant off. That's the whole OPSEC question answered on
one card. I'd screenshot that card for the vendor review, honestly."

## Outcome

Referred. Saved: the frozen set "Referred AL-40122" with her own note, and the evidence export
(findings report plus CSV) with the scope switched to the filter step's 13 transfers. She
completed the task, but found the "save the decision" step by accident and had to override the
default export scope to get the evidence that actually supports the referral.

## Single Ease Question

**5 of 7.** "Reading it was easy. The table, the times in UTC, the sources on every number, the
'nothing was uploaded' card -- that's better than what I get in the SIEM. Two things cost me. I
didn't know how to record 'refer' until I opened the filter chip, and the export defaulted to the
eight rows that don't show why I'm referring. And nothing tells me the data stops at Aug 1 when
the rule looks back to July."

## Would she use this instead of her current tool?

"Instead of, no. Alongside, for this kind of alert, yes, if it got through vendor review. For a
tier-1 structuring alert, my current tool is a Splunk search, an Excel pivot and a screenshot, and
this beats that: the hop sizes before I expand, the one-afternoon pattern in the account's own
transfers, and an evidence file that says where every number came from and that nothing left the
laptop. For hunting, where I start from a query, it's still clicks and a Shift+N, not a box I type
into, so my notebook stays. And it's not on the approved list, which ends the conversation before
any of this matters."

## Problems she ran into

1. **No visible way to record the decision.** No Clear or Refer action; the only "save" is Create
   set in the filter step's menu, reached through the "Filtered: 9 of 3,000" chip. She looked in
   the account's "..." menu first. Late in a shift she would not find it. (severity 3)
2. **Export defaults to the evidence that does not support the referral.** The default scope is
   the account's 8 transfers; the four alerted counterparties paying the money transfer merchant
   are only in the step's 13 edges. Exporting with one click drops the ring. (severity 3)
3. **The data's time range is never stated next to the rule's.** The alert's rule looks back 30
   days from Aug 7; the file holds only August. Outflow on Aug 6 (about 28,150 USD) exceeds
   everything that came in before it (3,479.70 USD) in this file, and nothing on screen or in the
   export's "holds" line says July is missing. (severity 3)
4. **A note on the set is signed by someone else.** The referred set shows a note signed "Nadia,
   10:27" when she expected her own; she wondered whether someone had already worked the alert.
   The note also concludes "pass-through", which the data cannot show without July. (severity 2)
5. **Unclear whether the exported figure carries its legend.** "The current view as its figure"
   does not say whether the Alerts legend travels with it; the diamonds mean nothing without it.
   (severity 2)
6. **No query box.** Neighbours by menu and Shift+N; she would rather type the expansion.
   (severity 1)

## What pleased her

- The hop sizes before expanding (9 / 283 / 2,122, and which two merchants make two hops junk).
- Every attribute names the file it came from and whether graphty computed it.
- "Edges of the selection ... 8 of 13" -- the table says when its scope changed.
- The footer's money in / money out, so she did not sum a column.
- "Nothing is uploaded" in the export dialog and the "Where the data is" card listing every file
  written.
- The filter step says what was kept from it before she deletes it.
