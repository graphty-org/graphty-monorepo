# Session: a flagged account, clear or refer -- Sarah, level-2 fraud investigator

Participant: Sarah (persona: study/personas/fraud-analyst.md), eight years in financial crime,
now works only escalated cases. Mode: not mandated -- her own five minutes and one real task. She
finished the task, so the patience limit never bit.

Task as given by the moderator: "An alert names account ACC-365386. Decide whether to clear it or
refer it, and save what you would attach as evidence."

Screens seen, in order (study view, 1440 x 900, rendered fresh for this session): the alert triage
screen's task states -- open, find, the Neighbors menu, one hop, the account's own transfers, the
referred set with its note, export, the filter step menu, "Where the data is"
(shots/r6-sarah-flagged-01-open.png to r6-sarah-flagged-09-file.png). Then, following controls she
saw in the Neighbors menu, the direction-and-date trace and the later case export
(shots/r6-sarah-flagged-y-case-trace-menu.png, r6-sarah-flagged-y-case-trace.png,
r6-sarah-flagged-y-case-export.png). She also glanced at the other named screens
(shots/r6-sarah-flagged-x-*.png). HTML read only to see what the Nodes tab, the step menu and the
Export "+" would do when clicked.

## Think-aloud

**Opening screen.** "Grey honeycomb, orange diamonds. Fifty alerts, the little box says. The
honeycomb is '2,950 nodes drawn as density' -- fine, it's not a hairball, and I don't need it.
The table under it is the alert queue: alertId, account, scenario, risk score. AL-40122,
ACC-365386, structuring, 92 -- it's the last row, half cut off at the bottom. I'd click that row
before I found the little magnifier next to 'Graphs'. Where's the search box? It's an icon. The
one thing everybody does first and it's an icon."

**Found it.** The mock shows the search filled in and the account selected. "Right side is the
customer. Personal, US, risk 92 -- and it says the 92 is the bank's own rating from the accounts
file, not computed by this thing. Good. I'm not defending somebody else's score to an examiner.
Alert Aug 7 02:17, the scenario is three or more transfers of 9,000 to 9,999 out in 30 days."

"Now -- Money in 22,670.50. Money out 28,321.82. 'Sum of amount over its transfers.' That's the
first thing I'd have built a pivot for, and it's just sitting there. Eight neighbours, three in,
five out. OK. That's the in-versus-out I want before I look at anything else." She notices out
exceeds in by about 5,650. "Out is more than in. So either there was an opening balance or cash
went in that isn't in this file. Note to self: I need the statement for that."

**The Neighbors menu.** "Hops from ACC-365386: 1 hop, 9 nodes, 13 edges. 2 hops, 283 --
'mostly through ACC-597001, Pharmacy, 152 neighbors, and ACC-512219, Streaming, 109.' That's the
most useful line on the screen. It tells me two hops is everybody who buys aspirin before I blow
the chart up. One hop."

"'Direction: Both' and 'From: Any time.' Those are new to me -- that's exactly the question I ask
second: out only, from the day before the alert. I'll come back to that. 'Filter to neighbors'
versus 'Select neighbors' -- don't know, don't care, the highlighted one is Filter, I press that."

**One hop.** Nine accounts. "Five diamonds out of nine. Five alerted accounts around one alerted
account -- the legend says 'alert is true, 5'. That's not a coincidence. And everyone connects to
ACC-465572 at the bottom."

"No arrows on the lines. No amounts on the lines. The picture says 'connected', not 'paid'. I read
the table." Edges, largest first: 9,863.99, 9,815.97, 9,782.28, 9,707.38, 9,662.37, 9,616.35,
9,326.81. "Every single one just under ten thousand. 274887 to 465572, 796219 to 465572, 898028
to 465572, 228299 to 465572. Everybody around this account pays just-under-ten into the same
account."

She clicks the Nodes tab (from the HTML, it lists the nine accounts with category and money in and
out). "ACC-465572: merchant, 'Money transfer', in 119,109.02, out 0.00. So that's where it lands,
and whatever it does with it isn't in this file. And the four personal accounts -- 21 to 24
thousand in, 28 to 29 thousand out, each. Same shape as mine. Five accounts with the same
fingerprint. That's the part I'd have needed five more statements for in Excel."

**The account's own transfers.** She selects ACC-365386; the edges narrow to its 8, in time order.
"Aug 3, 90.81 out -- nothing. Aug 5, 3,479.70 in from 916833. Aug 6, three out in two and a half
hours: 9,260.78, 9,662.37, 9,139.58. Alert Aug 7 02:17. The rule did what it says. Then Aug 17,
9,863.99 back in from 796219, Aug 24, 9,326.81 back in from 228299 -- two of the accounts in this
cluster paying into it."

"And the footer: 8 rows selected, Money in 22,670.50 (3 transfers), Money out 28,321.82 (5
transfers). Last time I'd have added that up on a sticky note. That's the pivot, at the bottom of
the table, with the count of rows next to it so I can tick it back. Cool. I mean that."

**Decision.** "Refer. Structured amounts out, just under the threshold, same afternoon, to
accounts that are themselves alerted for the same thing, which all pay one money transfer
business, and two of them pay back in. An L1 who cleared this would be in my QA sample by Friday."

**Trying the direction and date.** She goes back to the Neighbors menu and sets Direction to Out
and From to Aug 6, 2026 (shots/r6-sarah-flagged-y-case-trace-menu.png). "'On or after, on the
column time (UTC).' Good, it tells me which column and which clock. 1 hop, 'its 4 transfers out
from Aug 6 on'. 2 hops, 11 nodes."

The trace (r6-sarah-flagged-y-case-trace.png). "Now there are arrows. Why are there arrows here and
not on the one-hop picture? That's the same money." She reads the table: 'sender's hop', 'time
order', 'starts the trace', 'in order', and one row with a clock, "earlier than the hop before
(Aug 21 12:15)". "ACC-556231 to 465572 on Aug 10 -- but the money it would have got came Aug 21.
So that transfer can't be our money. It tells me. Most tools would draw that as a path and let me
put it in a SAR. That's the kind of thing that saves me in front of an examiner."

Footer: "Money in before Aug 6: 3,479.70 (1 transfer). Money out from Aug 6 on: 28,231.01 (4
transfers)." "There it is in one line: 3.5 thousand in before, 28 thousand out after. That is not
pass-through. It's money leaving that didn't come in through this file."

"But the right panel confuses me. Connections: 4 neighbors, links in 0, links out 4. Then Money in
22,670.50. Links in zero and money in twenty-two thousand? The small print says the money is 'on
the full graph' and the counts are for this step. I get it once I read it. A reviewer looking over
my shoulder won't; they'll say the numbers don't match. Put both on the same footing or label the
counts 'in this step' as loudly as the money says 'full graph'."

**Refer it.** "There's no Refer button, no disposition. Fine -- the disposition goes in the case
system, not here. I just need this to keep the nine accounts and my reasons so the next person
opens the same picture." The mock shows a frozen set, "Referred AL-40122, 9", and a note. From the
HTML, the set is made from the filter step's own menu: open the "Filtered: 9 of 3,000 nodes" chip,
then the step's menu -- Rename, Create rule set, Create set, Delete step.

"I would never have found that on my own. My first try is the '+' next to 'Sets and paths', because
that's where sets are. Second try is right-clicking the account. The filter chip is the last place
I'd look -- it looks like a status, not a menu. And 'Create rule set' next to 'Create set' -- no
idea what the difference is. I'd pick 'Create set' because it's shorter. 'Frozen' -- I'll guess it
won't change if the data changes. Good, if so."

"The little black bar says 'Add note -- Undo'. Undo the note? I didn't add a note, the mock
did. And whose note is it -- 'Nadia, 10:27'. I'd write my own. Hers is decent: times and amounts.
But she ends with 'Pass-through pattern', and the footer I just read says 3.5 thousand in, 28
thousand out. A QA reviewer would strike that sentence. The difference now is that the tool gives
her the number to catch herself -- it's two inches below the note. It still doesn't stop her."

**Evidence.** She selects the account and uses Export ("+") -> "Export the selection's edges... 8
transfers: time and amount". The dialog (r6-sarah-flagged-07-seed-evidence.png): "Findings report
(.html), Table (.csv). evidence-AL-40122.html and AL-40122-transfers.csv -- named by alert id, my
reviewer can match them. It shows me the 8 rows before it writes anything. 'Names 9 accounts: 6
people, 3 merchants.' Footer: '2 files go to the download folder. Nothing is uploaded.' That's the
sentence I forward to IT."

"But the default scope is wrong for a referral. Eight transfers is this account's statement -- I can
get that from core banking. The reason I'm referring is the other five accounts paying 465572.
Under the drop-down in grey: 'Other scopes: the selection, the filter step ACC-365386 and
neighbors (9 nodes, 13 edges), the set Referred AL-40122.' I switch to the filter step, 13
transfers. I found that because I read small print with numbers in it. A new L1 won't."

"'Holds ... the current view as its figure.' So there's a picture inside the HTML. I want a
picture I can paste into Word for the narrative. Not on this dialog." She looks at the later case
export (r6-sarah-flagged-y-case-export.png): "Here there's 'Figure (.svg), legend and scope drawn
in', and 'Gray check: alerted accounts stay apart in gray, as diamonds among circles'. That gray
check is exactly my problem -- our case file gets photocopied. But why does the case screen get a
figure file and the referral doesn't? And SVG -- will Word take that on a bank laptop? I don't
know. I know PNG works."

**Where it lives.** "Where the data is" (r6-sarah-flagged-09-file.png): "Read from this computer,
uploaded: nothing, saved in this browser, 4 files written out, Assistant off. That's a clean
answer. But 'saved in this browser' means the set and the note are on the laptop of whoever made
them. If an L1 refers this to me, what I get is whatever file they exported. So the set is for
them, the export is for me. Then the export had better be the 13, not the 8."

**The other screens.** "The inspector one (r6-sarah-flagged-x-screens-inspector-html-flagged.png)
says ACC-365386 is in GB, March 2026, money in 19,449.22. The one I just worked said US, August,
22,670.50. Same account number, different country and different money. If that's a different
file, it needs to say so louder than a small title. If it's the same account, one of them is wrong.
And it has 'Louvain, Community 33' and 'PageRank 0.000385' -- I'm not touching those; I can't put
'community 33' in a SAR." The table and filter-step screens are Les Miserables: "That's a novel. Not
my case." She skips them.

## Decision reached

Refer. Evidence she would save: evidence-AL-40122.html and a CSV of the 13 transfers in the
"ACC-365386 and neighbors" step (after changing the export scope from the default 8), plus a
cropped screenshot of the one-hop chart for the Word narrative. She would NOT need her own in/out
pivot this time: the inspector and the table footer gave her the sums, and the dated trace gave
her "3,479.70 in before Aug 6, 28,231.01 out from Aug 6 on". Workarounds she still used: reading the
grey small print to find the right export scope; a screenshot for the picture; the set made through
a menu she was told about rather than found.

## Single Ease Question

**6 of 7.** "Getting to a decision was easy -- search, one hop, table, and this time the money was
added up for me, on the account and at the bottom of the table. I didn't open Excel to decide. It's
not a 7 because saving the evidence still makes me dig: the wrong scope by default, no picture file
on the referral, and the set hidden behind the filter chip."

## Would she use this instead of her current tool?

"Instead of? No. Beside, yes, if IT approves it -- and 'nothing is uploaded, graphty runs in this
browser tab' is what gets it through the door. It doesn't replace the case system, Excel or Word,
and shouldn't try. What it did that my pivot doesn't: it showed me in one screen that the
counterparties are alerted too, have the same in-and-out shape, and all pay the same money
transfer business -- and the dated trace told me which transfers can't be our money because they
happened first. That's an hour saved on a case and a stronger SAR. What would stop me using it on
real referrals: if the set only lives on the L1's laptop and the export defaults to the account's
own statement, I'm going to get thin escalations with the wrong eight rows."
