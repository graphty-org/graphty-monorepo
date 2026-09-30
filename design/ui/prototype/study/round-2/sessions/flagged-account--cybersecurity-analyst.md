# Session: "An alert flagged ACC-365386. Clear it or refer it?" -- Priya, threat hunter at a bank

Participant: Priya, senior threat hunter on a bank's security operations team (persona:
study/personas/cybersecurity-analyst.md). Dark mode, managed Edge, about half a 1440p monitor
(the Find page was looked at 1280 wide; the rest at 1440).

Task as given by the moderator: "An alert flagged account ACC-365386. Decide whether to clear it
or refer it, and keep what you would need to justify that."

Screens used, in order: Find (just opened, then an id with no match), the Inspector (one node,
and the 7,495-selected state on the March transfers), the Filter chip and its steps, the Notes
panel (empty, and a chosen note), and the Export dialog (a table with values not current, and the
evidence file). Pictures: shots/record/find--s1--dark.png, shots/record/study-r2-priya-find-s10.png,
shots/inspector-one-node--dark.png, shots/record/inspector-cap--dark.png,
shots/record/filter-chip-three--dark.png, shots/record/notes-panel-s1--dark.png, shots/record/notes-panel-s3--dark.png,
shots/record/study-r2-priya-export-table.png, shots/record/study-r2-priya-export-evidence.png.

## Before starting

> "ACC-" -- that's an account number, so this is a transactions alert, not an auth alert. Fraud
> or AML, not really my queue, but I cover the queue when people are out, so fine. How I'd do
> this normally: pull the account's transactions for the alert window in Splunk, sort by amount,
> look at the counterparties, check if any of them are already known bad. Then write a
> disposition: true positive, benign positive, false positive, with the evidence attached.
> So what I want from you is: the account, its counterparties, the time window, and somewhere to
> type my verdict.

## Step 1 -- Find, just opened

Looked at the Find render with the box empty.

> Search box is top left, "Name, id or value", it already has focus. Good. The tooltip says
> "Paste a list of ids to find them all" -- that's useful, I'd paste an IOC list into that.
> Title says "Les Miserables. Filtered: 28 of 77 nodes, 3 steps." ... Les Miserables? That's not
> my data. Whatever, I'll search anyway, maybe it's all one project.

Typed the account id.

## Step 2 -- Find, an id with no match

> "0 results in all 77 nodes. 0 matches for ACC-365386." OK. So the account isn't in this file.
> At least it says "all 77 nodes" and not just the 28 that are filtered, so I know it's not the
> filter hiding it. That's actually the right thing -- a lot of tools search only what's drawn and
> you find out an hour later.
>
> But now what? It doesn't say "this id isn't in this project, it is in Transfers, March 2026".
> It doesn't offer me the other files. I have to guess that the account lives in some other
> project. There's a little down-arrow next to "Les Miserables", I'd click that and hope there's
> a list of projects.

Read the HTML to see what the project name does: nothing is wired in this mock. Moderator allowed
her to move on to the transfers data as if she had picked it from that menu.

> In real life I'd have typed the id, got zero, and assumed the alert was on an account that's
> not in the export. That's a wrong conclusion and a dangerous one: "account not found, clear it."
> If you're telling me zero, tell me zero where. Zero in this project isn't zero.

## Step 3 -- Inspector, one node (Human protein interactions)

The next screen she was handed showed a protein graph with TP53 selected.

> Proteins. OK, you've lost me, this is a different project again. I'll treat it as "what the
> right panel looks like when I click one thing."
>
> What I like: every number has a rank next to it. "Degree 32, #2 of 300." "Betweenness 0.1139,
> #2 of 300." That's the first thing I'd want for an account: is it an outlier, or is it
> normal for this population? A number without a baseline is useless to me, and this gives the
> baseline. Neighbors 32, Edges 32, with an arrow, so I can pivot to the counterparties. And
> "Memberships: in 2 sets" -- for my account that'd tell me if someone already put it in a case.
>
> What's missing for my job: time. Degree 32 over what window? For a transfer account I want
> "sent 14 transfers, received 3, first seen, last seen, total amount". There's no first/last
> timestamp anywhere on this panel.

## Step 4 -- Inspector, the transfers project, 7,495 selected

> Now we're on "Transfers, March 2026". Right data, finally. And the time range is in the
> project name -- March 2026. Fine, I can tie numbers to a window. That's not nothing.
>
> This state is someone selecting two hops out from a big merchant: 1,863 accounts, 5,632
> transfers, hex blob in the middle. "Flagged: 13 of 14." "Memberships: Mule ring, holds 13 of
> 7,495." So there's a set called "Mule ring", 14 accounts, fixed. Is my account in it? This
> screen doesn't say. The table at the bottom only shows four merchants.
>
> What I actually wanted to do here is click my account and see its neighbours, one hop, sorted
> by amount, with dates. The toolbar has a thing that looks like "expand" on the inspector for a
> node. I can't run it here on ACC-365386 because no screen has ACC-365386 selected.

## Step 5 -- Filter chip and its steps (Les Miserables again)

> Back to Les Mis. The steps list is nice: "Filter to largest component 76, degree >= 5 41,
> filter out group 8 28". Each step with the count after it. That's exactly my Splunk pipeline:
> each pipe and how many rows survive. I can tick one off and see the count come back. I'd use
> that.
>
> Where do I type it, though? "Add step" -- I'm guessing it gives me a builder. I'd want to type
> "amount > 9000 and date between 03-01 and 03-31". And I'd want a time-range step as a
> first-class thing, not something I build from an attribute. There's no time step in the list.

## Step 6 -- Notes panel

Empty state first.

> Notes, empty. It's literally blank on the left. No "write your first note", no button in the
> panel. I'd guess the plus next to "Notes" on the right side is how. OK.

Then the chosen note.

> Now this I like. "TP53 is the only DNA repair protein in the top five by betweenness..." and
> then "Cites: Betweenness, full graph" and "Quotes: TP53 betweenness 0.114". The note carries
> the number it's talking about and where it came from. That's my notebook cell with its query
> attached. For my disposition I'd write "ACC-365386 referred: in mule ring set, riskScore 92,
> 8 counterparties, March 2026" and I'd want it to quote those values the same way.
>
> What I can't tell: is there a verdict field? Clear, refer, false positive? It's free text. I'd
> type "REFER" at the top of the note in caps like I do in the ticket. That's the workaround.

## Step 7 -- Export, a nodes table

> Export. Scope "Full graph, 300 nodes". Nodes table, CSV, and it shows me the columns and says
> which ones are out of date. PageRank "out of date: ran before the last data change". Honestly,
> that's better than my notebook. My notebook would happily write a stale column and I'd never
> know. And there's a methods file next to it. My lead will ask "how did you compute that", and
> that's the answer, written for me.
>
> I can get the matches out as a CSV. That's the one I needed.

## Step 8 -- Export, the evidence file (the mule ring case)

> "Mule ring, case ACC-233575." Scope "Filtered: 14 nodes." Page 1, Boundary, a table of 14
> accounts ... there. ACC-365386, personal, GB, riskScore 92, degree 8, PageRank 0.000385.
> Eighth row. So my account is in somebody else's mule ring case.
>
> That's my answer, and it's also a problem. The only place in this whole walk-through where I
> saw my account was as a row in someone else's export dialog. I didn't find it, I stumbled on
> it. And it doesn't tell me why it's in the ring. riskScore 92 -- whose score? The alert
> system's? Computed here? Over what dates? The page header says "from transfers-2026-03.csv" so
> at least it's March.
>
> The file list at the bottom says "(file format: the owner's decision)" and on the left there
> are pink tags "waits on graphty-element: findings report". I don't know what graphty-element
> is. If that's a real product label, it tells me the button I need doesn't work yet.

## Decision

> Refer. It's in a 14-account set someone named "Mule ring", riskScore 92, 13 of the 14 are
> flagged, and it's a GB personal account in a ring that's mostly personal accounts in BR, PH,
> NG. That's a textbook referral. I would not clear it.
>
> But what I'd put in the ticket is thin: a row from someone else's report. I never saw this
> account's own transfers, its counterparties, amounts, or the dates. If my lead asks "what did
> it do?", I can't answer from what I saw. In Splunk I'd have that in one search.

## After the task

**Single Ease Question: 2 of 7.**

> Hard. Not because any one control was bad -- a couple were good -- but because I never got to
> my account. Search said zero, the next screens were proteins and Les Miserables, and I found
> the account by accident in an export preview.

**Would she use this instead of her current tool?**

> For this job, no. An alert triage is "one account, its transactions, in time order, and a
> verdict." That's a table and a timeline. Nothing here showed me an account's transfers in
> time order, and search didn't send me to the right project.
>
> What would make me come back: the stale-column warning on export, the methods file, and the
> notes that quote the number they're about. Those are things my notebook doesn't do. If search
> told me which project an id is in, and clicking an account gave me its counterparties sorted by
> amount with dates, I'd try it on a real alert. Right now I'd go back to Splunk and paste the
> 14 account ids from that report into a search.

## Problems observed

1. Find says "0 matches for ACC-365386" in the open project and stops. It does not say the id
   exists in another project or offer to search all projects, so the obvious reading is "account
   not in the data" -- which on an alert is the wrong and risky conclusion. (Severity 4)
2. No screen lets her open the flagged account itself: no inspector for ACC-365386, no one-hop
   neighbours, no transfers list. She reached a decision only by spotting the id as row 8 of
   another analyst's evidence preview. (Severity 4)
3. No time dimension on an account: the inspector shows degree and ranks but no first/last
   seen, no amounts over a window, and the filter steps offer no time-range step. The only time
   anchor is the project name "Transfers, March 2026". (Severity 3)
4. The mocks jump between Les Miserables, proteins and transfers, so the task's thread is lost;
   she could not tell whether the project menu was how to get to the transfers. (Severity 3)
5. The evidence preview lists riskScore 92 without saying where the score came from or over
   which dates, and membership in "Mule ring" without the reason. She cannot justify the referral
   past "someone else put it in a set". (Severity 3)
6. No place for a disposition (clear / refer / false positive); she would type "REFER" at the top
   of a free-text note. (Severity 2)
7. Internal build labels appear in the export dialog ("waits on graphty-element: findings
   report", "file format: the owner's decision"), which read as "this does not work yet".
   (Severity 2)
8. The empty Notes panel is completely blank with no way to start a note in the panel itself.
   (Severity 1)

## What she liked

- Find counts across the whole graph ("in all 77 nodes"), not just what the filter left drawn.
- Every inspector number has a rank against the population ("#2 of 300") -- a baseline for free.
- Filter steps with the surviving count after each, like a query pipeline.
- A note that cites and quotes the value it is about.
- Export marks stale or dropped columns instead of writing them silently, and writes a methods
  file with the table.
