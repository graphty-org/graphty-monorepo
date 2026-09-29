# Session: a flagged account -- Sarah, fraud investigator

Participant: Sarah, a level-2 financial crime investigator (composite persona, study/personas/fraud-analyst.md).
Mode: first impression, not mandated. She gives a new tool about five minutes of her own initiative.
Task as given by the moderator: "An alert flagged account ACC-365386. Decide whether to clear it or refer it, and keep what you would need to justify that."
Screens, in the order she reached them: Find, Inspector, Filter chip, Notes panel, Export dialog. Each was rendered in its current state and read as a picture; the page source was read only to learn what a click would do.

## Transcript

**Find, just opened.**
"OK. Account number, search box, top left. 'Name, id or value.' Good, that's what I want."
She reads the tooltip's first line and stops. "Paste a list of ids -- fine, useful later for the ring."
"Title says 'Les Miserables'. I don't know what that is. Somebody's test file? Whatever, I'll paste."

**Find, the id pasted: "0 matches for ACC-365386".**
"Zero. Header says '0 results in all 77 nodes'. Seventy-seven? My bank has millions of accounts. So this isn't my data."
"No 'did you mean', which is correct -- ACC-365388 is somebody else, don't offer me that. But where IS my data? It doesn't say 'this account isn't in this file, open Transfers'. It just says zero."
She clicks the title "Les Miserables" with the arrow next to it, expecting a list of files. In the prototype nothing happens ("not working in this mock").
"So I'm stuck on the first screen. In real life I'd ring whoever set it up. In the case system I type the account number and I get the customer. That's the bar."

**Inspector.** (The moderator moves her on.)
"Proteins. TP53. This is biology. Not mine." She flicks the states.
"The '1 hop / 2 hops / 3 hops' menu -- 33 nodes, 169, 296. That's what I'd want for an account: counterparties, then theirs. With the counts before I click, so I know if it's going to be a hairball. Good, if it worked on accounts."
"Edge: 'TP53 -- BRCA1, confidence 0.71.' On mine that has to be amount, date, direction, how many transfers. One number on a link is useless to me."
"Found path, '3 hops, 1 of 12'. Hops, I understand. That's flow of funds if the arrows are money. 'Node values are log2FoldChange' -- no idea."

**Inspector, past the selection cap: "Transfers, March 2026".**
"Finally. Accounts. 3,000 accounts, 'Mule ring, fixed, 14' on the left. Somebody's already built a ring."
"Two hops from a merchant, 1,863 accounts, one outline, '7,495 selected'. Fine -- it didn't freeze and it tells me the number. That's the payment-processor test and it passes, sort of. But it's a grey blob. I'd never put that in a file."
"Table: id, kind, country, total degree, riskScore, flagged. riskScore 62 on a merchant -- from what? Who scored it? I can't put 'riskScore 62' in a SAR."
"Where's my account? Not in the first seven rows. There's a search icon on the table -- I'd try that. Can't in this mock."
"And 'Memberships: Mule ring holds 13 of 1,863 nodes'. So 13 of the ring are in this blob. Which 13? Is mine one?"

**Filter chip.**
"Back to Les Miserables." She reads the steps.
"'Filter to degree >= 5', '3 dropped below degree 5 by Filter out group = 8'. I get it: these are steps, with counts, and I can tick one off. That's actually how I'd want to write it up -- 'excluded payroll accounts, 312 removed'. If I could name them in plain words and not 'group = 8'."
"'degree' again. Degree of what? In my world that's 'number of counterparties'. Say that."

**Notes panel.**
"Notes list on the left, each saying what it's about, with a date. 'Cites Betweenness, full graph.' Fine."
"This is the bit that matters for me: a note that sits on the account and carries the number it's talking about. 'Quotes: TP53 betweenness 0.114.' If that said 'Quotes: ACC-365386, 9,800 out within 26 hours' I'd be interested."
"Edit, Delete. No history of who wrote it or when it changed, other than '2h'. My QA will ask who wrote the note. There's an 'A' in a circle up top -- is that the author? Doesn't say."
"And no disposition. There's nowhere to say 'referred' or 'cleared, reason: family account'. A note is not a disposition."

**Export dialog, the evidence file.**
She opens this one expecting a PNG and a CSV. She reads the page title "Mule ring, case ACC-233575" first.
"Wait. Page 1, Boundary, 14 accounts. ACC-365386 -- there. Eighth row. personal, GB, riskScore 92, degree 8, PageRank 0.000385."
"So the account my alert fired on is already in somebody's mule-ring case, under a different case number. That's the single most important fact of this task and I found it in the export preview of someone else's case. Not in search. Not in the inspector."
"'Scope: Filtered: 14 nodes, 1 step: in Mule ring suspects'. Who put it in the ring? On what basis? 'Fixed set' means somebody hand-picked them. The boundary page doesn't say why 365386 is in."
"PageRank. I'd never click that. Why is PageRank in my evidence file? The examiner is going to ask me what it is and I can't answer."
"No amounts. No dates. Not one transfer on this page. Evidence of what? That it's in a list."
"Pages: Boundary, Ring overview, Cash-out route -- '4-account path, 1 note'. OK, the cash-out route is what I'd want. Can't open it from here."
"'waits on graphty-element: findings report'. Pink badge. So the evidence file doesn't exist yet."
"File format: 'the owner's decision'. An .html? I need PDF or Word for the case file. And a CSV of transactions for my reviewer."

**Export dialog, figure and table states.**
"This one I like: the nodes table shows 'out of date: ran before the last data change' on every row. That's honest. If a number went stale and it told me, that's the audit trail. Most tools just give you the old number."
"'Gray' preview -- good. Everything I file gets printed black and white."
"The toast at the end names every file and says '1 result out of date, 1 not kept'. Fine."
"'Assistant: Off. Nothing is sent.' in the side rail. That line I'd show IT. It should be louder."

## Decision

"I can't clear it and I can't refer it off these screens. What I know: it sits in a 14-account mule-ring set, riskScore 92, eight counterparties. What I don't know: who sent it what, when, how much, where the money went next, and why it's in the ring. That's the whole case.
If you forced me I'd refer it on the ring membership alone and write 'see case ACC-233575'. But I'd do the actual work in the statement export and a pivot, like always, because nothing here gave me a single amount."

## Single Ease Question

2 of 7. "Hard. Search didn't find it, the account never appeared on a screen of its own, and I found it by accident in an export preview."

## Would she use it instead of her current tool?

"No. Not for this. For an alert on one account, Excel and the case system win -- I'd have the in-and-out totals in ten minutes. What I saw that I'd want in i2's place, for the big cases: the hop menu with counts before you click, filter steps that say how many they removed, notes that quote the number they're about, and an export that marks a number as out of date. That's real. But until I can type an account, see its transfers with amounts and dates, and get a PNG and a transactions CSV out, it's a viewer. And it'd still need IT to sign off."

## Problems observed

1. Find, no-match state -- the id search reports "0 matches" on the wrong graph but does not say which open graph holds accounts or offer to switch; the graph title menu looked like the way out and did nothing. Blocked the task at the first step. Severity 4.
2. Inspector and Export -- no amount, date or direction appears on any transfer in any screen, though the transfers data has an amount column; a flow-of-funds decision is impossible. Severity 4.
3. Export, evidence file -- the flagged account's ring membership is only discoverable in another case's export preview; nothing on the account itself says "in Mule ring, case ACC-233575". Severity 3.
4. Evidence file and table -- riskScore and PageRank are shown with no source or reason; she will not put an unexplained score or an algorithm name in a SAR. Severity 3.
5. Evidence file -- the "fixed set" boundary does not record who added each account or why. Severity 3.
6. Notes panel -- no author, no disposition (clear / refer with reason), and "2h" is the only time shown; not an audit trail. Severity 3.
7. Export -- evidence file format undecided and shown as .html; she needs a document for the case file plus a transactions CSV. Severity 2.
8. Throughout -- "degree", "node", "betweenness" are developer words; she reads "degree" only after mapping it to "number of counterparties". Severity 2.
9. Inspector, past the cap -- 1,863 accounts drawn as one grey blob; survives the scale test but is not a picture she could file. Severity 2.

## What she liked

- The hop menu that states 33 / 169 / 296 before selecting.
- Filter steps that each say how many they removed and can be ticked off.
- Exports that mark stale values "out of date" instead of silently writing them.
- The Gray preview in the export dialog.
- "Assistant: Off. Nothing is sent." in the side rail.
- Find refusing to offer ACC-365388 as a near match for an id.
