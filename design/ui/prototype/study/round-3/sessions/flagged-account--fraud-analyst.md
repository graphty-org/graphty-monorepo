# Session: a flagged account, with the fraud investigator

Participant: Sarah, fraud investigator at a mid-size bank (composite persona, see
study/personas/fraud-analyst.md). Mode: voluntary -- no manager mandate, so she gives the tool
her usual few minutes and one real task.

Task as given by the moderator: "An alert flagged account ACC-365386. Decide whether to clear it
or refer it, and keep what you would need to justify that."

Screens, in the order she was shown them: Find, the inspector, the filter chip and its steps,
the notes panel, the Export dialog. She saw them as a participant sees them (design notes off),
and the moderator told her what a click would open, as a clickable prototype would.

Outcome: she did not reach a decision on the account. She found the account only at the very
end, as one row in someone else's export preview. She never saw a single transfer amount or
date for it.

## Transcript

**Find (first screen).**

> OK, where's the search. Top left, "thenard" is in it. So that's the box. I paste
> ACC-365386 and hit Enter.

Moderator: the screen you have shows what Find does. This project is a novel's character list.

> A novel. Right. Fine, the demo data. So I'm meant to imagine it's my account. It found two
> people, it zoomed in on one, it put a ring on it, the table on the bottom highlights the row.
> That part is what I want: I type an ID, it takes me there, the row comes up. Good. "degree
> 11, 16 in the full graph" -- I don't know what degree is and I don't know why there are two
> of them. Is that sixteen counterparties?

Moderator shows the other Find states; she stops on the transfers one.

> Now this is my kind of data. "Transfers, April 2026", 3,093 accounts. Somebody typed
> ACC-705989, "0 matches in Transfers, April 2026 (3,093 accounts)." That I like, it tells me
> WHICH month I searched, not "no results". And "Search recent projects" -- found it in March.
> That's real: accounts close, the alert is on last month's file. Good.
>
> But it's not my account. Where's 365386? I'd type it and I don't know what I get. Also the
> picture is a hairball. Three thousand dots. I'm not looking at that, I'm looking at the table.
>
> The table sorts by degree and shows me merchants. I don't care about the biggest merchant
> in the bank. Show me MY account and what it sent.

**Inspector.**

> This one opens on proteins. TP53. OK, whatever. There's a "Neighbors" button with 1 hop, 2
> hops, 3 hops and how many each would be -- 33, 169, 296. That's the thing. One hop, two hops,
> and it tells me the count before I do it so I don't blow the screen up. That's genuinely
> useful. "Path to..." -- path to what? If that's "show me how money gets from this account to
> that cash-out account", I want it. I'd guess that's what it is.
>
> Then the next one: "Transfers, March 2026", 7,495 selected, somebody grabbed two hops off the
> biggest merchant, 1,863 accounts. There's a set on the left, "Mule ring, fixed, 14". The table
> has riskScore and "flagged true/false". OK. So somebody already built a mule ring. Is my
> account in it? I can't tell from here. The inspector says "Mule ring holds 13 of 1,863 nodes".
>
> What I'm not seeing anywhere: amounts. Dates. Direction. "Edges 2 attributes" -- I assume
> one's the amount. For a referral I need: in versus out, how fast, to whom. The screen gives me
> "total degree 907". That's a count of links, not money. I'd be exporting to Excel right here
> to pivot it.

**Filter chip.**

> Novel again. "Filter to degree >= 2, took out 17, 60 left." I'd never do that; I don't filter
> on "degree". Skipped. Oh wait -- underneath, "A time window is a filter step. Mar 8 to Mar 14."
> A date filter with a histogram of transfers per day. That's the one thing on this page I'd
> use: the alert window. I'd want the window centered on the alert date, and I'd want the chart
> to show me, on this account, the money in and the money out on the same days. It shows
> transfers per day for the whole bank. Closer, not there.
>
> Is "Filter to" and "Filter out" going to catch me out? Probably once. Ctrl+Z undoes, it says.
> Fine.

**Notes panel.**

> Proteins. "No notes yet. Add a note about the selection." "Notes are saved in the project and
> travel in project files and findings reports." OK -- so if I write "rapid pass-through,
> 9,800 of 10,000 out in 26 hours, refer" on the account, it goes in the evidence file. That's
> what I'd want. The filled one shows a note citing a number with where the number came from.
> That's the right instinct for an examiner. For me the citation should be transfers, rows,
> not "Betweenness, full graph".
>
> Where does the note live -- is it on this machine? "Travel in project files". Which file? On
> which drive? I'd ask IT that before I type a customer's name into it.

**Export dialog.**

> Now we're talking. "Export." First thing I read: "1 file goes to your Downloads folder.
> Nothing is uploaded." Good. That sentence I can put in front of my manager.
>
> The first version is proteins with a colour legend and a warning that two colours look the
> same in grey. That's actually considerate, my case file goes through a black-and-white
> printer. Fine.
>
> The case one: "Mule ring, case ACC-233575." Findings report, "this is the case's evidence
> file". Page 1 Boundary, page 2 Ring overview, page 3 Cash-out route, "the 4-account path,
> 1 note", then Methods. Page 1 is a table of fourteen accounts --
>
> THERE. ACC-365386. Row eight. GB, riskScore 92, degree 8. So my account is in somebody's mule
> ring. That's the first time in five screens I've seen it.
>
> And that's all it says about it. A risk score -- from where? Which model, which rules? I can't
> write "riskScore 92" in a SAR. Degree 8 -- eight counterparties, I think. No amounts, no dates.
> The cash-out route page says "the 4-account path" -- is my account on the path? How much went
> through it? The report would tell me, maybe, but I can't see page 3 from here.
>
> The CSV export: accounts only, 14 rows, riskScore and PageRank. What's PageRank. I need the
> transfers: from, to, amount, timestamp. "Export table as CSV" says one table -- if I can flip
> the table to Edges first and export that, fine, but nothing on screen says so. And the methods
> file says "Weight: amount's meaning not answered, so no measure used it." I don't know what
> that means but it sounds like the tool doesn't know the amount is money.
>
> "(file format: the owner's decision)" on the evidence file name -- who's the owner? Me? The
> vendor? That's not a sentence for a user.

**Decision.**

> Can I clear or refer ACC-365386 from what you showed me? No. What I know: it's in a
> 14-account set somebody called "Mule ring", in March transfers, with eight counterparties and
> a score I can't explain. I'd refer it -- but on the say-so of whoever built that set, not on
> anything I saw move. If QA asked me "why", I'd be pulling the statement into Excel anyway.
>
> What I'd keep: that evidence file, if page 1 and the cash-out page had amounts and dates on
> them. Right now I'd keep it as a picture for the file and rebuild the numbers in a pivot.

## After the task

Single Ease Question: **2 of 7.**

> Hard, but not because the buttons are hard. Because the screen never showed me my account
> doing anything. Every screen was somebody else's data, and the money isn't on any of them.

Would she use it instead of her current tool?

> Not instead of Excel. Maybe instead of i2 for the big ring cases, if it did three things:
> account ID in, one and two hops out with amounts and dates on the links; a date window around
> the alert; and that evidence file with the transfers in it, not just a list of accounts. The
> "nothing is uploaded" line and the "0 matches in April, found in March" are the two things
> I'd actually tell a colleague about. The rest I've seen in a demo before.

## Workarounds she named

- Would export to Excel to total in versus out by counterparty (no amounts anywhere on screen).
- Would write the hop count and the path by hand into the narrative.
- Would keep the evidence file as "a picture for the file" and rebuild every figure in a pivot.
- Would ask IT where notes are stored before writing a customer name into one.

## Problems observed

1. **The task's account is not reachable from Find.** No Find state searches ACC-365386; the
   nearest shows a different account (ACC-705989) in April. She met her own account only as row
   eight of another case's export preview. Severity 4.
2. **No money on any screen.** Amounts, dates and direction of transfers never appear on the
   canvas, the inspector, the table or the evidence file; the account is described by "degree"
   and "riskScore". Without amounts she cannot disposition the alert. Severity 4.
3. **riskScore and PageRank are unexplained numbers.** She cannot put "riskScore 92" in a SAR
   without its source; PageRank means nothing to her. Severity 3.
4. **Transactions do not leave the tool.** The table export offered is accounts only; nothing
   says the Edges tab can be exported as transfers, and the methods text says the amount's meaning
   was "not answered". Severity 3.
5. **Most screens show unrelated data** (a novel's characters, proteins), so she had to imagine
   her case on them; she stopped trusting that what she saw applied to her. Severity 2.
6. **"Degree" and "degree 11, 16 in the full graph"** read as developer words; she guessed it
   meant counterparties. Severity 2.
7. **The time window filters the whole bank's transfers per day,** not the flagged account's in
   and out around the alert date. Severity 2.
8. **"(file format: the owner's decision)"** shows next to the evidence file name, and the Export
   and Inspector pages show the mock's own state links at the top, even in the participant view.
   Severity 1.
9. **Where notes are stored is not said in terms she can check** ("travel in project files").
   Severity 2.

## What worked for her

- "0 matches in Transfers, April 2026 (3,093 accounts)" plus "Search recent projects" finding
  the account in March -- names the month searched and handles closed accounts.
- The Neighbors menu counting 1, 2 and 3 hops before she commits.
- "1 file goes to your Downloads folder. Nothing is uploaded."
- The grey-print warning on the figure.
- The evidence file's shape: boundary, overview, cash-out route, notes, methods.
