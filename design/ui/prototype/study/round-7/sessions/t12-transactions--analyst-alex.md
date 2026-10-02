# Session: trace the money (transfers sample) -- Analyst Alex

Task as given by the moderator: "Money left account ACC-271813 and ended up in ACC-233575, which the
monitoring system marked as suspicious. Through which accounts did it travel, counting only
transfers in the way the money actually moved, and how much passed along the way?"

All commands were run from `design/ui/prototype`. Renders are in
`tmp/round-7-sessions/t12-transactions--analyst-alex/`.

## Step 1 -- the start screen (shots/tasks/t12-transactions/01.png)

> OK. "Transfers, March 2026". Top bar says "Local only" -- I'll take that as the data staying on my
> machine, fine. Right side: 3,000 nodes, 9,113 edges, directed, weight is "amount, stronger". One
> weak component, so the two accounts are at least connected somehow. Good, directed is what I need,
> "the way the money moved" means following the arrows.
>
> This is a path question. In NetworkX I'd do `nx.shortest_path(G, src, dst)`. There's a link that
> says "Analyze (Shift+A)". I'll try that.

## Step 2 -- Analyze

```
timeout 120 node app-b/study.mjs --try .../02.png task:t12-transactions --click "Analyze"
```

> A search box and a list. "Shortest path -- the fewest steps, or the lightest route, between two
> nodes" is right there under Recent. Didn't even have to type. Good.

## Step 3 -- Shortest path

```
timeout 120 node app-b/study.mjs --try .../03.png task:t12-transactions --click "Analyze" --click "Shortest path"
```

> "Path between". From is already ACC-271813, To is already ACC-233575. Huh -- I didn't pick those.
> Convenient, I guess it remembered them? I'd want to know where it got them from, but they're the
> right ones, so fine.
>
> Direction: "Follow edges" is selected, the other option is "Either way". Follow edges is what the
> task wants -- only transfers in the direction the money went. Good that it's the default and good
> that it's spelled out.
>
> Weight: "amount (loaded weight)", "Stronger / Farther / Capacity", and a note that it reads the
> weight as distance, 1/amount. So bigger transfers count as "closer". For money tracing that's
> actually a reasonable default -- follow the big flows. I don't totally get what "Capacity" would do
> here, I'm not going to touch it. Scope whole graph, 3,000 accounts. Find path.

## Step 4 -- Find path

```
timeout 120 node app-b/study.mjs --try .../04.png task:t12-transactions --click "Analyze" --click "Shortest path" --click "Find path"
```

> OK, the right panel has it in a table. In order:
>
> - ACC-271813 (start, business, risk score 1) -> 3,530.28 on 4 Mar
> - ACC-946224 (via) -> 9,468.23 on 7 Mar
> - ACC-670564 (via) -> 9,399.31 on 9 Mar
> - ACC-233575 (end, personal, risk score 98, flagged)
>
> "Dates in order: Yes" on every hop. That's actually the thing I'd have had to check by hand in
> pandas -- that the money couldn't have moved backwards in time. I like that a lot.
>
> Total amount in the summary: 22,397.82. Let me add it up: 3,530.28 + 9,468.23 + 9,399.31 =
> 22,397.82. Matches.
>
> But the little chip at the bottom of the graph says "3 edges, total amount 22,929.05". That's not
> the same number. Which one goes in my write-up? That's exactly the kind of thing that ends up in a
> report wrong. I trust the one I can add up myself, but now I'm nervous about the other numbers.
>
> Also: "Made with -- Weight: amount, farther". I ran it with "Stronger" highlighted. So did it run
> with the setting I saw or a different one? Same path either way? I can't tell.
>
> And the picture. Suddenly the whole thing is colored by "Louvain, 35 groups" and there's a "Links
> in (count)" layer in the left list. I didn't run Louvain. Before I clicked anything it said
> "Nothing is colored or sized". Where did that come from? The path itself is orange, and Community 5
> in the legend is also orange, so I genuinely cannot find my four accounts in that hairball. A few
> bigger dots near the right middle, maybe. The picture is useless to me for this; the table is the
> answer.
>
> One more thing a director will ask: "how much passed along the way". The first hop is only
> 3,530.28, and then ACC-946224 sends 9,468.23 onward. So at most 3,530.28 of that onward money can
> be the money that came from ACC-271813 -- the rest came from somewhere else. The tool shows "in /
> out, this trace" per account, which is how I spotted it, but it doesn't say this out loud. The
> "total amount" of 22k is the sum of three transfers, not the amount that traveled.

## Step 5 -- click "4 accounts, 3 transfers"

```
timeout 120 node app-b/study.mjs --try .../05.png task:t12-transactions --click "Analyze" --click "Shortest path" --click "Find path" --click "4 accounts, 3 transfers"
```

> Hoping that highlights them on the graph. A tooltip says "Selects the path's accounts and
> transfers", but I can't see anything different on the picture. Still lost in the colors.

## Step 6 -- "All options..."

```
timeout 120 node app-b/study.mjs --try .../06.png task:t12-transactions --click "Analyze" --click "Shortest path" --click "Find path" --click "All options..."
```

> "Made with: Weight amount, farther. Direction Follow it. Scope full graph, 3,000 accounts. Data
> version transfers-2026-03.csv, current." Good -- direction confirmed, and I like the file name
> being recorded, that's what I'd need next month. Still says "farther", not "stronger". I'm going
> to note it and stop.

## My answer

The money went ACC-271813 -> ACC-946224 -> ACC-670564 -> ACC-233575, three transfers following the
direction of the money, dates in order (4 Mar, 7 Mar, 9 Mar). The three transfers were 3,530.28,
9,468.23 and 9,399.31, which sum to 22,397.82. But only up to 3,530.28 can be the same money all the
way through, since that is all ACC-271813 sent in. I would report 3,530.28 as what traveled and the
22,397.82 as the total moved along the chain, and I'd flag that the app showed 22,929.05 in one
place.

## Wrap-up

- **Succeeded?** Mostly. I'm confident about the four accounts and the direction. I'm less confident
  about "how much", because the app showed two different totals and the settings summary named a
  weight option different from the one I saw selected.
- **Single Ease Question:** 5 of 7. Finding and running it was quick -- three clicks, accounts
  already filled in. Losing points for the mismatched total, the "stronger" vs "farther" label, and a
  picture I could not read.
- **Would I use this instead of my current tool?** For this kind of question, maybe -- the
  dates-in-order check and the per-hop table save me a pandas session, and Gephi would never give me
  this. But I would not put the number in a report until someone tells me why the chip and the
  summary disagree. If the numbers all agreed I'd use it. For now I'd still check it in NetworkX.
