# Session: a flagged account, clear or refer -- Priya, threat hunter

Participant: Priya (persona: study/personas/cybersecurity-analyst.md), senior threat hunter in a
bank SOC who still covers the alert queue when someone is out. Her home ground is Splunk,
Defender and a Jupyter notebook, not transaction monitoring; this alert is a money-laundering
scenario, so she is working somebody else's queue. She says so once and gets on with it.

Task as given by the moderator: "An alert names account ACC-365386. Decide whether to clear it or
refer it, and save what you would attach as evidence."

Screens seen, in order (study view, 1440 x 900, as rendered by kit/shoot.mjs --tasks
flagged-account): shots/tasks/flagged-account/ 01 open, 02 find, 03 the Neighbors menu, 04 one
hop, 05 the account's own transfers, 06 the referred set with its note, 07 the export dialog, 08
the step menu, 09 "Where the data is". She glanced at screens/find.html and the top of
screens/export-dialog.html (other data, other files) to see whether Find has a keyboard key and
what an exported figure carries. HTML read only to see what the Neighbors caret, the scope
dropdown in Export and the step menu would do when clicked.

## Think-aloud

**Before anything (01).** "Three questions first. Is it approved? Where does it run? Does it
phone home?" She scans the left rail. "'Assistant. Off. Nothing is sent.' OK, that's one of the
three, sort of. It says the assistant sends nothing. It doesn't say the rest of the app sends
nothing. In a real trial I'd have stopped at the approved list, but fine, it's a study."

"'Created from: Alert triage recipe, team shared drive.' What came off a shared drive? The
recipe or the data? If this thing writes back to a share, that's a conversation with my
manager."

**The opening picture (01).** "Grey honeycomb, orange diamonds. Diamonds are the alerts, the
little box says 50. 'Density' for the other 2,950. I don't care about the picture. The table is
the useful thing -- that's the alert queue, alertId, account, scenario, riskScore. And there it
is at the bottom, half cut off: AL-40122, ACC-365386, 'Structuring: 3 or more transfers of
9,000...', 92, degree 8. I could have started from the row."

"Which time range is this? The file tab says 'transfers-2...' -- truncated. I'm going to assume
August because the project's called August alerts. Nothing on the screen says August 1 to August
31."

**Find (02).** She tries Ctrl+F. (The find page says Ctrl+F opens Find from anywhere in the app,
so she takes it that works; nothing says whether "/" does.) She types the account. "One hit,
'personal, US; in Alerts'. Good, it matched. Inspector on the right."

She reads the inspector top to bottom, fast. "riskScore 92, 'from accounts-2026-08.csv ... as
delivered; not computed by graphty.' Good. That's the first thing I'd have asked -- is that your
score or ours. alertTime Aug 7 02:17 UTC, from the alerts file. 8 neighbours, in 3, out 5."

"And what's this black toast? 'Delete step ACC-749505 and neighbors -- Undo.' I didn't delete
anything. Who's ACC-749505? That's the previous alert, I guess, somebody else's work. If I walked
up to this cold I'd hit Undo just to see what I'd broken."

**How far to look (03).** She opens the caret on Neighbors. "1 hop, 9 nodes, 13 edges. 2 hops,
283. 3 hops, 2,122. And it tells me why 2 hops blows up -- a pharmacy with 152 neighbours and a
streaming service with 109. That's actually useful. That's exactly the thing Sentinel never tells
you: expand this and you'll get two hundred entities, and here's the reason. One hop. I'm not
expanding through a pharmacy."

"Nine nodes, 13 edges, but the account has 8 neighbours. So the extra 5 edges are between the
neighbours. Fine, that adds up."

**One hop (04).** "Chip says 'Filtered: 9 of 3,000 nodes'. Five diamonds out of nine -- five of
the nine are alerted. That's not normal. The drawing has no arrows and no amounts, so I can't tell
who paid whom from the picture. I'm going to the table."

"Edges tab, 13 of 9,171 edges, sorted by amount. Everything near the top is nine-thousand-
something. And a lot of them land on ACC-465572. 274887, 796219, 898028, 228299 -- all into
465572. That's a sink."

**The account's own transfers, in time order (05).** She clicks the account and sorts by time.
"Header says 'Edges of the selection, ACC-365386: 8 of 13 edges'. It followed my selection. Good.
Time order. This is my timeline -- I'd have asked for a timeline, and this table sorted by time
is close enough."

She reads it the way she would read a logon sequence.

- "Aug 3, 90.81 out to 597001 -- the pharmacy. Normal life."
- "Aug 5 09:09, 3,479.70 in from 916833."
- "Aug 6, 15:21, 9,260.78 out. 15:44, 9,662.37 out. 17:42, 9,139.58 out. Three outs, all just
  under ten thousand, three different people, inside two and a half hours. That's the rule, on the
  nose."
- "Alert Aug 7 02:17. Eight and a half hours after the third one. Makes sense for a nightly batch."
- "Then Aug 17, 9,863.99 in from 796219. Aug 24, 9,326.81 in from 228299. Both of those are
  diamonds too."

"Wait. 3,479 in, then 28,000 out the next day. The money that went out didn't come in this month.
So either it was sitting in the account before August, or there's July data I don't have. The
rule says 'in 30 days'. Thirty days back from Aug 7 is July 8. I have August. I'm deciding on a
window I can only half see. The tool doesn't warn me about that and I wouldn't expect it to know
the rule's window -- but it could at least tell me what dates are in the file."

"And the eighth row is below the fold. At my half-monitor I'd probably see it; here I have to
scroll." (In the export dialog later she sees it: Aug 30, 168.28 to 512219, the streaming
service. "Netflix, basically. Noise.")

"Decision: refer. It's not close. Structured outs to three alerted people, who all pay the same
money transfer service, and two other alerted people paying back in later. That's a ring or a
mule chain. Not my job to prove which. Level 2's."

**Keep it and say why (06).** On the frame the set "Referred AL-40122" exists with a note. "OK,
the step's menu makes a set from these nine. Frozen, 9. Fine, that's my boundary, so level 2 sees
what I saw."

She reads the note. "'Escalate. In 3,479.70 ... out the next day ... all four personal
counterparties are alerted for structuring and all four pay ACC-465572. Pass-through pattern.'
That's what I'd have written, minus 'pass-through' -- with 3.5k in and 28k out before the alert,
it isn't pass-through, not in this window. The later ins make it look like a loop. I'd write
'structured outflow, counterparties alerted, common payee 465572, ins after alert from alerted
accounts'. Signed 'Nadia, 10:27'. Who's Nadia? If that's supposed to be me, it isn't. If it's
somebody else's note on my alert, I want to know that before I trust it."

"Can I get the note out as text? Or is it only in the report? I'd paste it into the case system,
not attach an HTML file."

**Evidence (07).** She selects the account and opens Export from the inspector. "Findings report
HTML plus a CSV. The dialog lists the rows before it writes anything -- 8 transfers, time and
amount. Good, I can check it against what I just read. File names have the alert id in them:
evidence-AL-40122.html, AL-40122-transfers.csv. I'd have renamed them myself otherwise."

"'2 files go to the download folder. Nothing is uploaded.' That's the sentence I wanted on the
first screen."

"But hold on. My reason for referring is the four transfers into 465572. Those aren't this
account's edges -- they're the neighbours'. The default scope is 'the selection's edges: 8
transfers'. If I attach this, level 2 gets the structuring and not the common payee. The scope
dropdown offers 'the filter step, 9 nodes, 13 edges'. That's what I'd actually pick, or I'd
export both. Nothing told me the default leaves out half my argument -- I only caught it because I
read the scope line."

"'holds ... the current view as its figure'. The view is the nine-node drawing. Does the picture
come with a legend saying diamond means alerted? The other export page says figures carry a
legend. OK. Without that, a diamond in a PDF means nothing to whoever opens it."

"CSV columns: source, target, time (UTC), amount (USD). That goes straight into Splunk or a
lookup. Good. I'd want the counterparties' kind -- merchant, personal -- in there too, because
'465572 is a money transfer service' is the whole point and the CSV doesn't say it."

**Done with it (08).** Filter chip, step menu. "'Kept from this step: set Referred AL-40122, 1
note. Evidence exported 10:31.' So I can delete the step and not lose anything. That's a good
line. My notebook doesn't tell me that, I just know. Delete step, Delete key, undoable. Fine."

**Did anything leave? (09).** The file chip opens "Where the data is". "Read from this computer.
'graphty runs in this browser tab and has no server of its own.' Uploaded: nothing this session.
Saved: in this browser. Written out: 4 files, and it names them. Assistant off, and if you turn it
on it sends the question and the rows to the provider. That's the honest version and it's the
right version."

"Two things. First, 'saved in this browser' -- on a managed Edge profile, bank data in browser
storage is its own review question. I'd want to know I can wipe it. Second, this is the answer to
my first three questions and it's behind a chip I'd never click. I'd want it before I load the
file, not after."

"Four files written, two of them for AL-40121 -- that's the alert before mine. Somebody else's
evidence in my session list again. Same as the toast and 'Nadia'. On a shared queue that's
realistic, but it made me second-guess what I'd done."

**Glance at the other pages.** Find page: "Ctrl+F, Enter, Esc, F6 at the bottom. Keyboard hints
on screen -- good. No query box, though. For this task I didn't need one. For the hunt I actually
do, I'd want to type 'amount between 9000 and 9999 and out and count >= 3 in 30d' and see what
it matches, not click it together."

## Decision reached

Refer. Evidence she would attach: the transfers CSV and the findings report, but with the export
scope changed from "the selection's edges (8)" to "the filter step (9 nodes, 13 edges)" so the
four transfers into ACC-465572 are in the file; plus her own note pasted into the case system as
text. She would add one line to the note saying the file covers August only and the rule's 30-day
window reaches back into July.

About five minutes of real work; most of the time went on reading the edges table in time order,
which she called "the only part I'd actually use".

## Single Ease Question

**5 of 7.** "Finding the account, sizing the hop and reading the transfers in time order was easy.
Two things cost me: I had to notice on my own that the default evidence leaves out the transfers
my decision rests on, and I never knew for sure what dates the file covered. And the other
people's leftovers -- the toast, 'Nadia', the AL-40121 files -- made me stop and check I hadn't
done something."

## Would she use this instead of her current tool?

"For this -- one alert, clear or refer, five minutes -- it's better than what I'd do today, which
is three Splunk searches and copying rows into the ticket. The hop sizes before I commit, the
table following my selection, and the export listing the rows before it writes: those are real.
The graph itself told me one thing the table didn't: that four of them pay the same account.
That's the pivot, and I'd have taken two more searches to see it in Splunk."

"But I'm not the person who works this queue, and for my own work -- hunting from a rule -- I
didn't see a box to type a query into, and I didn't see the dates of the data anywhere. And none
of it matters until it's on the approved list. So: I'd tell the fraud team to look at it. I
wouldn't move my hunts into it yet."

## Problems observed

1. **The default evidence scope omits the transfers the decision rests on.** (Export dialog, 07;
   severity 3.) The referral's reason is the four counterparties all paying ACC-465572, but "the
   selection's edges" exports only the account's own 8 transfers. She caught it only by reading
   the "other scopes" line and switched to the step's 13 edges. Nothing connects the note's claim
   to what the file contains. "If I attach this, level 2 gets the structuring and not the common
   payee."
2. **No stated time span for the data.** (Open, 01, and every screen; severity 3.) The file tab
   is truncated to "transfers-2...", and nowhere says which dates the file covers. The alert rule
   looks back 30 days from Aug 7; the account's big outflows came from money that did not arrive
   in August. "Which time range is this? I'm deciding on a window I can only half see."
3. **Another reviewer's leftovers read as her own actions.** (Find, 02; referred set, 06; file
   panel, 09; severity 2.) A "Delete step ACC-749505 and neighbors / Undo" toast on arrival, a
   note signed "Nadia", and AL-40121's files in "written out". "I didn't delete anything. Who's
   ACC-749505?" She wanted to hit Undo to see what she had broken.
4. **The privacy account is behind a chip she would never click.** ("Where the data is", 09;
   severity 2.) It answers her three first questions exactly, but only after the file is loaded
   and only if she opens the file chip. The rail's "Assistant off. Nothing is sent." covers the
   assistant, not the app. "That's the sentence I wanted on the first screen."
5. **The drawing does not show direction or amount.** (One hop, 04; severity 2.) No arrows, no
   amounts, so who paid whom came only from the Edges table. "I can't tell who paid whom from the
   picture. I'm going to the table."
6. **The counterparty's kind is not in the evidence CSV.** (Export dialog, 07; severity 2.) The
   CSV has source, target, time, amount; that ACC-465572 is a money transfer service -- the point
   of the referral -- is only in the set's member list ("merchant") and the note.
7. **"Saved in this browser" raises a review question the page does not answer.** (09; severity
   1.) On a managed browser she wants to know how to wipe what is stored. "Created from ... team
   shared drive" made her ask whether anything writes back to a share.
8. **No typed query.** (Find; severity 1 for this task, higher for her own hunts.) Not needed to
   triage one alert; the first thing she would miss for a rule-based hunt.
9. **The prepared note's wording is wrong for the window.** (06; severity 1, content of the mock
   rather than the design.) "Pass-through" does not hold before the alert: 3,479.70 in, about
   28,000 out. She would reword it.

## What worked for her

- The Neighbors caret giving each hop's size before committing, with the reason 2 hops jumps
  (a pharmacy and a streaming service). "That's exactly the thing Sentinel never tells you."
- The Edges tab following the selection ("8 of 13") and sorting by time: "This is my timeline."
- Provenance on every attribute: riskScore "as delivered; not computed by graphty", the alert
  time from the alerts file.
- The export dialog listing every row before writing, with alert-id file names and "Nothing is
  uploaded" at the button.
- The step menu's "Kept from this step: set, 1 note. Evidence exported 10:31" before deleting.
- "Where the data is": no server, nothing uploaded, every written file named, and what the
  Assistant would send if turned on.
- Counts that added up when she checked: 8 neighbours = in 3 + out 5; 9 nodes and 13 edges; 5 of
  9 alerted matched the 5 diamonds and the legend.
