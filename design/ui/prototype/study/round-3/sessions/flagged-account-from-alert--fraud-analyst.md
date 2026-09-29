# Session: an alerted account and its neighbourhood -- Sarah, fraud investigator

Participant: Sarah, level-2 financial crime investigator (simulated; persona in
study/personas/fraud-analyst.md). Mode: first impression, not mandated -- she gives it one real
task and about five minutes before deciding whether it is worth more.

Task as given by the moderator, and nothing more: "An alert names account ACC-365386. Start from
the alert and decide whether its neighbourhood is suspicious."

Material: the alert triage mock (screens/alert-triage.html), worked state by state as a
clickable prototype, from its first state (the project opening on the August alert queue). The
standalone Find and inspector mocks run on a protein dataset, not on transfers; she looked at
them only where the same panels appear inside the alert mock.

## Transcript (think-aloud)

**1. The opening screen.**
"OK. 'August alerts'. A grey honeycomb with orange diamonds on it -- that's the whole month, I
guess. That picture tells me nothing. I don't care where the dots are, I care about one account.
The table at the bottom is the useful bit: alert ID, account, scenario, risk score. That's my
queue view, basically what the case system gives me.

Where is my account... AL-40122, ACC-365386, it's the last row and it's cut off at the bottom of
the screen. Structuring, three or more transfers of 9,000 to 9,999 out in 30 days. Risk 92. Fine,
92 of what? Nobody ever tells you what the score is made of. I'll ignore it like I always do.

'Assistant off. Nothing is sent.' Good. That's the first thing I'd ask. Keep that."

**2. Finding the account.**
"I want to paste the account number somewhere. There are two magnifying glasses: one next to
'Graphs' on the left and one over the table. I'd honestly try Ctrl+F first and get the browser's
find. Then I'd click the left one because it's at the top." (Clicks the magnifier by Graphs; the
Find box opens; she pastes ACC-365386.)

"One hit, 'personal, US; in Alerts'. Good, it didn't make me pick from twenty fuzzy matches. It
circled it in the blob and highlighted the row. On the right: kind personal, country US, risk 92,
alert true, the scenario spelled out. 'Connections: 8 neighbors, In 3, Out 5.' That's the first
thing on this screen I'd actually use -- three paying in, five paid to. What I want next is how
much in, how much out. It doesn't say. In Excel that's the first pivot I build."

**3. Growing it.**
"'Node' with a 'Neighbors' button. Node is a developer word but fine, Neighbors I get -- who
it deals with. There's a little arrow next to it." (Opens the caret.) "Hops. 1 hop: 9 nodes, 13
edges. 2 hops: 283. 3 hops: 2,122. And it says why 2 hops jumps -- 'mostly through ACC-597001,
Pharmacy, 152 neighbors, and ACC-512219, Streaming, 109'. OK, that is actually good. That's
exactly the thing that wrecks every link chart I've built: you go two out and you've pulled in
everyone who buys from the chemist. It warned me before I did it. I'd take 1 hop first."
(Clicks Filter to neighbors, 1 hop.)

**4. One hop: nine accounts.**
"Nine accounts, a proper picture now, labelled with account numbers, not dots. Five orange
diamonds, so five of the nine are alerted themselves. That's already not a coincidence. The
Edges table, largest first: 9,863.99, 9,815.97, 9,782.28, 9,707.38, 9,662.37, 9,616.35,
9,326.81... Every one of them just under ten grand. And ACC-465572 is on the receiving end of a
lot of them. The table says it's a merchant, 'Money transfer'. So money goes in just under the
threshold and comes out through a money transfer service. That's pass-through. That's the
pattern.

Where are the dates? There is no date column. Source, target, amount. Structuring is 'in 30
days', rapid movement is 'in the same day' -- I can't say either without dates. Is that the same
9,800 going in Tuesday and out Wednesday or two unrelated payments three weeks apart? I can't tell
from this. I'd have to go back to the core banking screen and pull the statement anyway."

**5. Is it just the one account, or a ring?**
"The previous analyst's note is on the set -- 'Escalate... pass-through pattern.' Fine, I'd
read it but I'd redo it, I always do. I want to see if the others at one hop are also moving
money between themselves." (Opens the caret again, 2 hops, Filter to neighbors.) "283 accounts.
Yep, hairball, the two shops' customers fanning out like it warned. But the Edges table sorted by
amount still helps: the top of it is all 9,8-something. What I want is 'only show me the
transfers between 9,000 and 9,999'."

She looks for how. "Right-click the amount column? No. The filter chip at the top says
'Filtered: 283 of 3,000 nodes'." (Opens it.) "Filter steps, with a plus. OK." (Plus: 'New filter
step'.) "Keep: 'Edges, with their nodes'. What's an edge -- the transfer, I assume. Where: an
empty box. What do I type? I typed 'amount 9000-9999' and I'd expect it to reject that." (The
prototype shows the accepted form: amount between 9000 and 9999.99.) "So I have to know the
syntax. I would not have got that on my own without an example in the box. Once it's in, it
tells me the count before I commit: nodes, edges, how many alerted. That preview is good."

(Filter to: 14 accounts.) "Fourteen accounts, and now it looks like what it is: a bunch of
personal accounts paying each other just under ten grand, with the money transfer service in the
middle. ACC-523284 is off to the side with one line. Click it: alerted, Nigeria, one transfer of
9,000 to 9,999. '1 neighbors' -- whatever. 'Full graph: 3 neighbors: in 1, out 2.' So I'm only
seeing part of it here. I'd pull its statement; if the other two are a salary and a fuel
purchase it's a customer who paid a remittance once. I'd leave it out. The tool can't tell me
that, and I wouldn't trust it if it tried."

**6. Does the money actually flow from my account to the rest?**
"The second icon in the toolbar looks like a route." (Clicks it: From / To / Along transfers /
Run.) "From ACC-365386 to ACC-580664. 5 hops, every hop 9,260 to 9,861. And a line: 'Ignoring
direction, the shortest route is 2 hops, through ACC-465572. It is not a flow from one to the
other.' Good, somebody thought about that -- two people using the same Western Union is not a
ring, and I've seen juniors put exactly that in a narrative.

But again: is it a flow? Five hops of similar amounts only means something if they happen in
order -- out of mine Monday, out of the next one Tuesday. Without dates this is a chain of
payments, not a flow of funds. I can't write 'funds moved from A to F within 48 hours' off this."

**7. Getting it out.**
"Set of the 12, note, and then Export files." (Opens it.) "Evidence file, figure, CSVs of nodes
and edges. 'Names 46 accounts: the 12 members and 34 counterparties.' 'Nothing is uploaded.
4 files go to the download folder.' Grayscale check with diamonds versus circles -- somebody
knows our files get printed. That's the export I always ask for and never get. If the edges CSV
has dates and transaction IDs in it, my reviewer can tie every line back. If it's just
source-target-amount, it's the same gap as the screen."

**8. Her decision.**
"Suspicious, yes. The account is part of a group of twelve personal accounts in seven countries
passing transfers of 9,000 to 9,999 between each other and cashing out through one money
transfer service; four of them were never alerted. That's the rest of the ring and I got it in
maybe fifteen minutes, which for finding the ring is fast. Whether it's structuring in the legal
sense I can't say from this screen, because I can't see when any of it happened."

## Single Ease Question

4 of 7. "Finding the account and the first hop was easy. The hop sizes up front are the best
thing here. Getting from 283 to the fourteen that matter needed a filter I'd never have written
without being shown the words. And no dates means I'm still going to the statements for the half
of the job that matters for the SAR."

## Would she use it instead of her current tool?

"Instead of Excel? No. Next to it, for the big cases, maybe. It found the rest of the ring faster
than I'd do it by hand in i2, it warned me about the pharmacy customers, it says nothing leaves
the machine, and the export is the first one I've seen that my reviewer could use. But it has no
dates, no in-and-out totals per account, and filtering needs a little query language. Put a date
on every transfer, give me a timeline, and give me the in/out totals on the account panel, and
I'd ask my manager for it. As it stands it's a nice picture I still have to rebuild in a
spreadsheet. And my manager and IT decide anyway."

## Problems observed

| Where | What happened | Severity (1-4) |
|---|---|---|
| Every transfer table, the path panel, the inspector | Transfers carry no date. Structuring (30 days) and rapid movement (same day) cannot be judged, and a multi-hop path cannot be read as a flow of funds in time. | 4 |
| Filter steps, New filter step | Narrowing to transfers of 9,000-9,999 needs a typed expression (amount between 9000 and 9999.99) with no example, no picker, and no way to start it from the amount column. She would not have found the syntax. | 3 |
| Account inspector | Shows neighbour counts in and out but no amounts in and out, the first figure she needs. | 3 |
| Opening screen | The whole-month density picture tells her nothing; her alert row is cut off at the bottom of the table. | 2 |
| Top of left panel and table header | Two magnifier icons; not clear which is "find an account". She tried Ctrl+F first. | 2 |
| Alert table and inspector | Risk score (92) shown with no reason behind it. | 2 |
| Hop menu, filter editor | "nodes", "edges", "Node" labels: developer words on a transfer graph. | 1 |
| Inspector | "1 neighbors" grammar. | 1 |

## What worked for her

- The hop menu counted each hop before she committed and named the two shops that inflate
  2 hops.
- The path panel said outright that the undirected route through the money transfer service is
  not a flow.
- Find took a pasted account number and returned the single exact hit.
- The export said what it names, that nothing is uploaded, and checked the figure in grayscale.
- "Assistant off. Nothing is sent." was visible on every screen.
