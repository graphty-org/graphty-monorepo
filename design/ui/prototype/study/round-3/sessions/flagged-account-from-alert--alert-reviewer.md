# Session: a flagged account, starting from the alert -- level-1 alert reviewer

Participant: Nadia, level-1 transaction monitoring analyst (study/personas/alert-reviewer.md).
Task as given by the moderator: "An alert names account ACC-365386. Start from the alert and
decide whether its neighbourhood is suspicious."
Material: the alert triage mock (screens/alert-triage.html) and its renders in
shots/alert-triage/: the opened project, the account found, the Neighbors menu, neighbors
selected, one hop drawn, the referral with its note, and the evidence-file notice.

## Transcript (think-aloud)

**Opening the project.** "OK. There's a blob of grey hexagons and orange diamonds. I don't
know what the grey is -- '2,950 nodes drawn as density'. Fine, I don't need it. The part I
recognise is the table at the bottom: alertId, account, scenario, riskScore. That's my queue.
AL-40122, ACC-365386, 'Structuring: 3 or more transfers of 9,000...', risk 92. That's the one."

"First thing I'd do is click that row. Does clicking the row open the account? I can't tell
from here. I'll do what I always do and paste the account number into a search box. Where's
the search box? There's a little magnifier next to 'Graphs' and another one over the table.
I'll take the one on the left, top."

**Account found.** "OK, ACC-365386, 'personal, US; in Alerts'. The right side filled in:
riskScore 92, alertScenario 'Structuring: 3 or more transfers of 9,000 to 9,999 USD out in 30
days'. Good, that's the alert text, same as the case system. '8 neighbors, In 3, Out 5'.
So three people paid in, five got paid. That's the counterparties."

"Wait -- what's this black box in the middle? 'Delete step ACC-749505 and neighbors. Undo.'
Did I just delete something? ACC-749505 was my last alert, the tuition one. I didn't delete
anything, I searched. That makes me nervous. Is my last alert gone? Is the file I saved gone?
I'd leave that Undo alone and hope."

**The Neighbors button.** "There's a button 'Neighbors' with a little arrow. I click the
arrow. 'Hops from ACC-365386. 1 hop -- 9 nodes, 13 edges. 2 hops -- 283 nodes.' One hop is
the people it traded with directly, I think. 9, not 8? Oh, it's counting the account itself.
OK. Two hops is 283 and something about a pharmacy and a streaming company -- no, that's level
2's problem, I'm not going there."

"Then 'Filter to neighbors, 1 hop' and 'Select neighbors, 1 hop'. What's the difference? Filter
sounds like it throws the other 2,991 accounts away. Select sounds like it highlights them.
Does filter change the data or just the screen? I'd click Select, because select sounds safer."

**Neighbors selected.** "Nine circles lit up around the middle. On the right: '9 nodes, 6
personal, 3 merchant, alert 5 true, 4 false'. Five alerted out of nine -- so four of its
counterparties are ALSO in my queue this month. That's the first thing that actually tells me
something. In the case system I would never see that unless I opened every counterparty."

"The table shows the nine accounts: ACC-274887 alerted, ACC-898028 alerted, ACC-796219
alerted, ACC-228299 alerted, and ACC-465572, merchant, 'Money transfer'. And ACC-597001 is a
pharmacy with 152 connections -- everyone pays a pharmacy, so that's nothing."

"But I still can't see the circles in the picture properly, they're all over the blob. I'll
try the Filter one after all, since there's an Undo."

**One hop drawn.** "Oh, that's better. Now it's just the nine, with lines. Orange diamonds are
alerted. The chip at the top says 'Filtered: 9 of 3,000 nodes', so the other accounts are
hidden, not deleted -- I think. OK, and Edges at the bottom: source, target, amount. 9,863.99,
9,815.97, 9,782.28, 9,707.38, 9,662.37... every one of these is just under ten thousand.
That's the pattern."

"But here's my problem: the scenario says 'in 30 days'. Where are the dates? There's no date
column. For structuring I have to show QA that three of them were inside the window. I'd have
to go back to core banking for the dates anyway. And some of these rows aren't even my account
-- ACC-274887 to ACC-465572, that's two of the neighbours paying each other. I have to read
source and target on every line to find the ones that are 365386's own transfers. I'd want an
in/out column, or just 'this account's transfers' first."

"The thing I DO like: ACC-274887, ACC-796219, ACC-898028 and ACC-228299 all pay ACC-465572,
the money transfer merchant. Four alerted accounts, all under 10k, all into one money
transfer business. That's not tuition. That goes up."

**Deciding.** "Decision: suspicious. Escalate. I'm not writing the SAR, I'm deciding if Sarah
has to, and she has to."

**Referring it.** "How do I escalate from here? I don't see an 'Escalate' button. There's a
'...' and a pin. On the frame after this, the right side says 'Referred AL-40122, 9, Fixed set'
with a note. So I'd have made a set out of the nine and written a note. I'd have to find that
myself -- I'd guess the '...' menu. 'Fixed set' -- I don't know what fixed means, fixed as in
repaired? And the note: 'Escalate. Out: 9,662.37 to ACC-898028, 9,260.78 to ACC-274887...'
I'd be typing every amount again by hand out of the table. That's the copy-paste I already do
all day. Can I select the rows and have them go in the note? Doesn't look like it."

**Evidence.** "The last screen says six files were 'written out', evidence-AL-40122.html and
the nodes and edges CSVs. That's what I'd attach to the alert. If that HTML is one picture and
my note, QA would take it. 'Uploaded: nothing, this session' -- good, compliance would ask."

## After the task

**Single Ease Question: 4 of 7.** "The part where it showed me four of the counterparties were
alerted and all paying one money transfer place -- that took seconds, and I'd never see it
that fast otherwise. But I lost time on the delete notice, on filter versus select, on reading
source and target on every row, and I'd still need core banking for the dates. Maybe twelve
minutes for this alert. That's over my five to ten."

**Would she use it instead of her current tool?** "Not instead. Next to it, for this kind of
alert, yes. For tuition in August, no -- the case system is faster, I don't need a picture. For
structuring where the counterparties matter, this found the thing in one click. If it had the
transfer dates and an escalate button that wrote the amounts into the note for me, I'd open
it for every structuring alert. And my team lead decides, not me."

## Observed problems

1. No transfer date on the edges table, although the scenario that fired is defined by a
   30-day window; she cannot evidence the window from the tool. (severity 3)
2. The edges table mixes the alerted account's own transfers with transfers between its
   neighbours; there is no in/out column relative to the alerted account. (severity 2)
3. A leftover "Delete step ACC-749505 and neighbors / Undo" notice appears right after she
   searches for the new account; she reads it as something she deleted. (severity 2)
4. "Filter to neighbors" versus "Select neighbors": she cannot tell which changes the data;
   she picks Select because it "sounds safer", then needs Filter to read the picture.
   (severity 2)
5. No visible "refer / escalate" action; the referral is a set she would have to find how to
   make, and "Fixed set" is unclear. (severity 2)
6. The referral note is typed by hand, re-copying amounts already in the table. (severity 2)
7. Unclear whether clicking the alert row in the queue table opens the account; two small
   magnifier icons compete as "the search box". (severity 1)
8. The density hexagons on opening mean nothing to her. (severity 1)
