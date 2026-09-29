# Session: a flagged account -- fraud analyst (Sarah)

Participant: Sarah, complex-case fraud investigator at a mid-size bank (simulated; persona in
study/personas/fraud-analyst.md).
Mode: first impression, not mandated. She gives it one real task and about five minutes of
goodwill, then keeps going only because the moderator asks.
Task as given: "An alert flagged account ACC-365386. Decide whether to clear it or refer it, and
keep what you would need to justify that."
Screens, in the order she met them: Find, Inspector, Filter chip, Notes panel, Export dialog.
Material: static renders in shots/ and the mock pages in screens/ (read only to see what a
control would do when clicked).

## Transcript (think-aloud)

### 1. Find

> "OK. Account number. Where's the search box." Finds the box top left, "Name, id or value".
> "Good, that's what I want. It even says I can paste a list of ids -- that's actually useful,
> L1 sends me a list of linked accounts half the time."

She types ACC-365386 in her head and looks at what comes back. The graph open on this screen
is "Les Miserables", 77 nodes, characters called Valjean and Thenardier.

> "...Why is there a novel in my case tool? Where's my account?"

Moderator says the data on this screen is a stand-in. She looks at the result states anyway.

> "Fine. The results list says 'Left out by Filter out group 8' when the thing's hidden. I like
> that it tells me it's there but filtered, rather than pretending it doesn't exist. That
> matters -- if I search an account and get nothing I need to know if it's really not there or
> somebody's filter ate it."

The "no match" state: "0 matches; Closest: Thenardier".

> "Closest match on an account number is dangerous. ACC-365386 and ACC-365388 are two different
> customers. Don't offer me a near miss on an ID like it's a spelling mistake."

The Quick actions state ("who matters most" -> Run Degree, Betweenness, Closeness, PageRank,
Eigenvector, Katz, HITS).

> "No. I'm not clicking any of that. 'Who reaches everyone quickly' -- I don't care who reaches
> everyone, I care where the ten grand went. There's no 'where did the money go' in this list."

The pink designer notes are on top of every frame. She reads none of them.

> "There's a lot of pink sticky-note text over the picture. I'm skipping it."

The "past the drawing limit" state (124,318 nodes, "not drawn", table takes over):

> "Actually that's the right answer for our data. Don't draw a million dots, give me the table.
> 'Counted, not drawn' -- fine, as long as the counts are right."

Time at this point: about three minutes, and she still has not seen ACC-365386.

### 2. Inspector

The one-node state is a protein. She moves on to the state with money in it: "Transfers,
March 2026", 3,000 accounts, 7,495 selected, drawn as grey hexagons inside an outline.

> "Now we're talking, account IDs. ACC-393859, merchant, US, degree 907, riskScore 0. Where's
> 365386? Not in this table, it's sorted by degree and it's all merchants at the top."

She reads the right-hand panel: nodes 1,863, edges 5,632, merchant 60, business 309,
personal 1,494, flagged 13 of 14, "amount, edges $9,540,249.05".

> "Nine and a half million total across the selection. In or out? Over what dates? A total of
> everything touching two hops from a merchant is a number I can't use. I need in versus out
> for MY account, by counterparty, by date. That's the pivot table and it isn't here."

> "And the picture is a grey honeycomb. That's a hairball with better manners. I can't put that
> in a case file."

On "riskScore":

> "What is riskScore? Whose model? If I write 'risk score 92' in a narrative the examiner asks
> why 92 and I have nothing. There's no reason next to it anywhere."

She notices the "Mule ring -- holds 13 of 7,495" line under Memberships.

> "Somebody already built a set called 'Mule ring'. Who? When? On what basis? It says 'fixed'.
> That's somebody's conclusion stored as a list with no reasoning attached."

The path state (on the protein data) shows "Found path, 3 hops, 1 of 12", members in walk
order.

> "That shape I want. Hops in order, one of twelve equal paths. Put amounts and dates on each
> hop and that's my flow of funds. On this screen it's genes, so I'll take the idea on trust."

### 3. Filter chip

Les Miserables again. The chip reads "Filtered: 28 of 77 nodes - 3 steps"; the popover lists
"Filter to Largest component 76, Filter to degree >= 5 41, Filter out group = 8 28", each with
a checkbox.

> "This I understand. It's like my filter rows in Excel, but each step tells me how many are
> left. Tick one off and the count comes back. Ctrl+Z undoes -- good, I will hit Ctrl+Z."

> "What I'd actually filter: out the merchants, out the payroll accounts, only March, only
> over five grand. None of the steps here are dates or amounts, so I can't tell if it'll do
> 'amount over 5,000' on a transaction, or only on a dot."

> "The count is what makes it defensible. 'I excluded 60 merchants, 1,803 remained' -- I can
> write that. Is that list of steps saved with the case? If my reviewer opens it tomorrow do
> they see the same three steps? Nothing on screen says."

### 4. Notes panel

Protein data. The chosen-note state: a note "About TP53 neighborhood, 33 proteins", with
"CITES Betweenness full graph" and "QUOTES TP53 betweenness 0.114".

> "Now this is the first thing that is about my job. A note that's pinned to the thing it's
> about, and it records the number it quoted, and where the number came from. That's the audit
> trail. When QA asks 'where did 0.114 come from' it's right there."

> "Swap the protein for an account: 'ACC-365386 received 9,800 from four accounts on the 12th
> and sent 9,500 out on the 13th', quoting the transactions. If the quote holds the actual
> transaction rows and not just a score, I'd use this."

The "Out of date" state:

> "It tells me when the data under a note changed? Good. That's exactly the thing that bites
> you -- you write the narrative on Monday's pull and someone re-pulls on Wednesday."

She looks for a place to record the decision itself -- refer or clear -- and does not find
one.

> "Where do I say 'referred, reason: rapid pass-through, 4 hops'? I suppose that's a note on
> the account. Fine -- the disposition lives in the case system anyway, not here."

### 5. Export dialog

The third state, "The evidence file": scope "Filtered: 14 nodes", "Findings report -- HTML
report", pages Boundary, Ring overview, Cash-out route (the 4-account path, 1 note), Other
notes, Methods. Page 1 is a table of the 14 accounts.

> "There. ACC-365386. Personal, GB, riskScore 92, degree 8. Fifth screen, inside an export
> preview, is the first time I see the account I was asked about."

> "So according to this someone's already decided it's in the mule ring and the cash-out route
> is four accounts. If this were real, I'd refer -- a GB personal account with eight
> counterparties sitting in a flagged ring of 14 is worth a second look. But I'm referring on
> the strength of somebody else's set and a score I can't explain. That's not a decision I can
> defend, that's a decision I'm inheriting."

> "Things I like: 'Frozen at export: re-running the analysis later never changes this file.'
> Yes. That is what goes in the case file. Nodes table and edges table as CSV -- yes, I'll
> tick both, the edges table is the transactions and that's what I'll pivot. PNG of the
> current view -- yes."

> "Things I don't: the page lists 'PageRank (full graph)' as a column in the evidence file. I
> am never putting PageRank in a SAR. An examiner reads that and asks me what it means and I
> say 'Google'. Give me total in, total out, first and last transaction date."

> "It writes an HTML report. Where does it write it? Is this uploading anything? The screen
> doesn't say it stays on my machine. If I can't answer that I can't use it on customer data,
> full stop."

"Use in a script -- Not yet available":

> "Don't care."

## Outcome

She did not reach a decision she could defend. The account appears only on the export screen,
as a row in someone else's "Mule ring suspects" set, with a riskScore and a degree. Nowhere on
the five screens did she see a single transaction for ACC-365386 -- no amounts, no dates, no
direction, no counterparties by name. She would refer it, on inherited grounds, and says so.
The things she would keep for the file do exist and she liked them: the frozen evidence file,
the CSV of the transfers, a note that records the numbers it quotes.

Workarounds she named:
- "Export the edges CSV and pivot it in Excel for in/out by counterparty and date."
- "Write the hop count and the amounts on each hop by hand."
- "Drop the PageRank column from the evidence table before it goes in the file."

## Single Ease Question

2 of 7.

> "Two. Finding things is fine and the export is good. But the task was 'decide on this
> account', and I never saw a single transaction for it."

## Would she use it instead of her current tool?

> "Not instead. Next to, maybe. Excel does the money and i2 does the chart for the big ones. What
> this has that neither does is the notes that remember where each number came from, and the
> frozen evidence file -- that's the audit trail I currently build by hand in Word. Put amounts
> and dates on the links, give me in versus out for one account, tell me in plain words that
> nothing leaves the laptop, and I'll take it to my manager. Right now it's a demo on a novel
> and a protein set, with my account in the last screen."
