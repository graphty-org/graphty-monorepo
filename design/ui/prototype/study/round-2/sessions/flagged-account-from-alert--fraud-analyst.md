# Session: from an alert to a decision on its neighbourhood -- Sarah, fraud investigator

Participant: Sarah (simulated), complex-case financial crime investigator, eight years in. See
study/personas/fraud-analyst.md.

Mode: first impression, not mandated. Nobody told her this tool is coming; she was asked to try
it on one case. Patience: about five minutes before she decides whether it is worth more.

Task as given by the moderator: "An alert names account ACC-365386. Start from the alert and
decide whether its neighbourhood is suspicious."

Material: the alert triage screens (the project "August alerts", 3,000 accounts from a month of
transfers), walked in order from the alert queue to the export. The Find and Inspector screens
were shown too, but they run on other data (a novel's characters, human proteins), so she looked
at them only for how the controls behave.

Outcome: she reached a decision (suspicious, file) and an evidence export, but only because the
screens handed her the step that narrowed 283 accounts to 14. She could not see how she would
have made that step herself, and she never saw a date on any transfer.

---

## Transcript (think-aloud, her words)

### 1. The alert queue

> OK. August alerts, 3,000 accounts. There's a grey blob with orange diamonds on it -- I assume
> the diamonds are the alerts, the legend says "alert is true, 50". The grey hexagon things I
> don't know. "2,950 nodes drawn as density." Nodes. Fine, accounts.
>
> The table at the bottom is what I actually understand. Alert ID, account, scenario, risk
> score. AL-40122, ACC-365386, "Structuring: 3 or more transfers of 9,000 to 9,999 USD out in
> 30 days", risk 92. That's my alert. Risk 92 out of what, based on what -- I'll ignore it, the
> scenario is the part I can put in a narrative.
>
> "Total degree 8." I don't know what degree is. Eight of something.

She ignored the canvas and went straight to the table row.

### 2. Finding the account

> First thing I do is paste the account number into the search box. Top left, there's a
> magnifier. ACC-365386. One hit, "personal, US; in Alerts". Good, that was quick, that's what
> I wanted.
>
> Now the right side filled in. Kind personal, country US, risk 92, the scenario again.
> "Connections: 8 neighbors, In 3, Out 5." Three paying in, five paid to. OK. How much? That's
> the question. Three in and five out tells me nothing -- ten dollars in and ten grand out, or
> ten grand in and ten grand out? Where are the totals? In versus out is the first thing I build
> in the pivot.
>
> Where is the date it opened? Customer since when? Occupation? Nothing. I'd have the case
> system open on the other monitor for that anyway, but still.

### 3. Getting its counterparties

> I want the counterparties. There's a row of little icons under the account name: a thing that
> looks like a molecule, a funnel, a pin. No words on them. I'd hover. Molecule, probably
> "neighbours". I click it.

Reading the page: the main part of that button is "Select neighbors". The screen that follows
shows 9 accounts circled inside the grey blob, the table says "9 selected", and the right side
now says "9 nodes, Selection".

> Huh. It circled nine things in the blob. It didn't show me them. The picture is still 3,000
> accounts of grey. I wanted it to throw everything else away and draw these nine.
>
> There's a funnel next to it. Maybe that. Or the little arrow beside the molecule.

She opened the small arrow beside the button.

> "Hops from ACC-365386. 1 hop, 9 nodes, 13 edges. 2 hops, 283 nodes, 470 edges, mostly through
> ACC-597001 (Pharmacy, 152 neighbors) and ACC-512219 (Streaming, 109). 3 hops, 2,122."
>
> Now that's actually useful. It told me before I clicked that two hops is mostly a pharmacy's
> and a streaming service's customers. That's the hairball warning I never get. Good.
>
> Then at the bottom, "Select neighbors, 1 hop" and "Filter to neighbors, 1 hop". What's the
> difference? I guess filter is the one that throws the rest away. Why is the big button the
> one that doesn't?

She chose "Filter to neighbors, 1 hop". Nine accounts drawn, lines between them.

### 4. One hop

> OK, nine accounts. Five orange, four grey. The escalated one at the top, four alerted ones
> around it, a money transfer service in the middle, a pharmacy, a streaming thing, and one
> other.
>
> The lines have no arrows. Who paid whom? I can't tell from the picture. No amounts on the
> lines either. So the picture is decoration, and I'm back to the table.
>
> The Edges tab: source, target, amount, sorted biggest first. 9,863.99 from ACC-796219 into
> my account. 9,815.97 from ACC-274887 to ACC-465572, the money transfer service. 9,782,
> 9,707, 9,662 out of my account to ACC-898028, 9,616, 9,326... Everything is nine thousand
> something. That's the structuring right there, and it's not just my account, the
> counterparties are all doing it into the same money transfer service.
>
> WHEN? There's no date column. There's source, target, amount. That's it. The alert says
> "in 30 days". Rapid movement is money in and money out the same day. Without dates I can't
> say pass-through, I can't say structuring, I can say "a lot of transfers just under ten
> thousand at some point". That's not a SAR, that's a feeling.
>
> Is it in the ellipsis menu? Maybe you add columns there. I'd try. If the date isn't in this
> file I'm doing it in Excel from the statements anyway.

Nothing on the screens shows a date on a transfer, in the table, on a line, or in the right
panel for a transfer.

### 5. Two hops

> Let me see who else. Same arrow, 2 hops, and it already warned me: pharmacy and streaming.
> I take it anyway.

283 accounts. Two big starbursts around the pharmacy and the streaming service.

> Yeah. There's the hairball. Those two fans are every customer of a pharmacy and a streaming
> service, I don't care about any of them. At least it told me so. Can I say "don't go through
> those two"? There's a "Follow: All" line in the menu with an arrow. Maybe that's where you
> choose which links to follow. I wouldn't have known to try that. I want a "skip merchants"
> or "skip anything with more than 50 counterparties" and I don't see it.
>
> Table, sorted by amount: the top of the list is all 9,000 to 9,999. So the pattern is in
> here, somewhere under the two shops.

### 6. From 283 down to 14 -- the part she could not do

The next screen shows a step called "Transfers of 9,000 to 9,999 USD", 14 accounts, drawn as a
ring around the money transfer service.

> Wait. How did I get here? It says "Filter to Transfers of 9,000 to 9,999 USD: 14 nodes" in
> the black bar at the bottom. I didn't do that. Where is the thing that makes that? On the
> earlier screen there was a link, "Narrow the graph...", in the legend box. Maybe that. Or the
> funnel. I'm guessing.
>
> That is the single most important step in this whole thing -- keep only the transfers
> between nine and ten thousand -- and it's the one step I can't see how to do. In Excel it's a
> number filter on the amount column. Here I'd be hunting.
>
> But the result is right. Fourteen accounts passing nine-thousand-somethings to each other and
> into ACC-465572. That's a ring. That's the picture I'd want.

She clicked the odd one out, ACC-523284.

> Nigeria, alerted, "one transfer of 9,000 to 9,999". "1 neighbor in this view, full graph 3
> neighbors: in 1, out 2." So it's only barely in this. I'd pull its statement before I decided,
> the tool can't tell me if that's a salary. I'd leave it out until I've seen the statement.

### 7. Keeping the ring

> Now there's a "Ring around ACC-365386, 12, fixed set" on the left. Somebody made a set of the
> twelve. I'd have to find out how -- select them and do something in the dots menu, probably.
>
> The right side is good though. "Transfers among: 24. Total among: 226,756.28 USD." That's a
> number I can put in a narrative, and it came from the transfers, not a score. The note says
> it: twelve personal accounts in seven countries, 24 transfers just under 9,000, cashing out
> 109,887.89 through the money transfer service, four of them were never alerted. That's the
> first three sentences of my SAR. I'd write it myself, but that's the shape.
>
> Four never alerted and in the ring -- that's the thing the alert queue would never have
> given me. That's the "find the rest of the ring" part. Fine. Actually, better than fine.
>
> Where's the note stored? Is it in the file? If I close this and open it Monday, is it there?

### 8. Does money from my account reach the others?

> Path tool, the squiggly icon. From ACC-365386 to ACC-580664, "along transfers". Five hops,
> each 9,260 to 9,862. And a line saying ignoring direction it's two hops through the money
> transfer service, and that's not a flow. Good, somebody thought about that -- I'd have been
> burned by that in front of QA.
>
> But five hops in what order in time? Did the 9,260 go out Monday and the 9,788 go out Tuesday?
> Or was the last hop in July, before the first one? If it's not in date order, it's not a flow
> of funds, it's five unrelated transfers in a line. Again: dates.

### 9. Export

> Export files. "Findings report, the evidence file. Scope: Set: Ring around ACC-365386, 12
> nodes, 74 transfers touching them." "Names 46 accounts: the 12 members and 34 counterparties."
> Good that it tells me how many people's data is in the file before it writes it.
>
> Figure: PNG, legend drawn in, and it checked grayscale -- alerted stay diamonds. Our case
> files get printed black and white, so yes, that matters.
>
> Table: CSV of nodes and edges, same scope. That's what I'd actually use; I'd open it in Excel
> and build my pivot. If the CSV has dates in it, this is worth something.
>
> "4 files go to the download folder. Nothing is uploaded." Good. That's the first thing IT will
> ask.
>
> The evidence file is .html. My case system takes PDFs and Word. I'd have to print it to PDF.

### 10. The Find and Inspector screens

> This one's Les Miserables and this one's proteins. I can't judge them on my case. Same search
> box, same right panel. On a transfer, the right panel shows the two ends and a "confidence"
> number. On mine, I'd need amount, date, reference, channel. And the two ends should say which
> way the money went.

---

## Her decision on the task

> Suspicious. Twelve accounts, seven countries, twenty-four transfers all just under nine
> thousand to each other, cashing out through one money transfer service, four members never
> alerted. I'd file, after I pulled statements for the twelve and confirmed dates -- which the
> tool never showed me.

## Single Ease Question

**4 of 7.**

> The ends were easy: pasting the account in, and the export. The middle was a coin flip. I
> clicked the wrong neighbours button first, I couldn't see how the 9,000-to-9,999 cut was made,
> and I spent the whole time wanting a date column.

## Would she use this instead of her current tool?

> Not instead of Excel. Excel is where the dates and the totals are, and my reviewer reads Excel.
> Instead of i2 for the few cases a year where I need a link chart -- maybe. The hop menu warning
> me about the pharmacy, the ring totals, "not a flow" on the path, grayscale check, nothing
> uploaded -- i2 doesn't do any of that for me. But it has to show me when each transfer
> happened, and it has to let me cut by amount without me hunting for it. And my manager and IT
> pick it, not me.

---

## Problems observed

| Where | What happened | Severity (1-4) |
|---|---|---|
| Transfers table, lines on the chart, transfer panel, path panel | No date or time on any transfer anywhere. Structuring "in 30 days", pass-through and the order of the five-hop path cannot be judged. | 4 |
| One hop, two hops, ring chart | Lines have no direction arrows and no amounts; who paid whom only readable from the table. | 3 |
| Account panel, neighbours button | Unlabelled icon; its main click selects neighbours inside the 3,000-account blob instead of showing them. The one she wanted is in the small arrow menu. | 3 |
| From 283 accounts to 14 | The step "Transfers of 9,000 to 9,999 USD" appears already made; no visible control shows how to make an amount cut. She guessed "Narrow the graph..." or the funnel. | 3 |
| Account panel, connections | "8 neighbors, In 3, Out 5" gives counts, not money: no total in, total out, or how fast money leaves. | 3 |
| Two hops | Warned about the pharmacy and streaming hubs, but no visible way to skip merchants or very large accounts; "Follow: All" not understood as the place for it. | 2 |
| Everywhere | Developer words: nodes, edges, total degree, fixed set, rule, recipe, base style, density. | 2 |
| Ring set | How the 12-account set was made is not visible on the screens; she assumed "select, then the dots menu". | 2 |
| Account panel | No customer context (opened, occupation, expected activity); ruling out ACC-523284 still needs the statement from another system. | 2 |
| Export dialog | Evidence file is .html; her case system takes PDF or Word. | 2 |
| Opening screen | Grey hexagon density drawing means nothing to her; she ignored it for the table. | 1 |
| Find and Inspector screens | Built on a novel's characters and proteins, so they cannot be judged on a fraud case; the transfer panel shows "confidence", not amount and date. | 1 |

## What she liked

- Paste the account number, one hit, the account's details at once.
- The hop menu naming the pharmacy and the streaming service as the reason two hops is 283
  accounts, before she clicked.
- Ring totals from the transfers themselves: 24 transfers, 226,756.28 USD, 4 members never
  alerted.
- The path panel saying the 2-hop undirected route through the money transfer service is not a
  flow.
- Export: scoped to the ring, says how many accounts it names, grayscale print check, CSV of
  nodes and transfers, "Nothing is uploaded".
