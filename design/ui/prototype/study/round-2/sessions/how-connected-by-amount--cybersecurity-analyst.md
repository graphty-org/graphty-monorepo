# Session: how two accounts are connected, weighted by amount -- Priya, threat hunter

**Participant:** Priya, senior threat hunter at a regional bank's SOC (see the persona file,
study/personas/cybersecurity-analyst.md).
**Task, as the moderator gave it:** "Starting from two selected accounts, find how they are
connected, weighted by amount, and get the transfers with amounts and dates out."
**Screens used:** the inspector, the sets-and-paths screen and the bottom table, as static renders
with the HTML read only to see what a click would open.
**Result:** partly done. She found a connection and could get rows out, but never got a path that
was actually weighted by amount, and the rows she could export had no dates.
**Ease (1-7):** 3.

## Before starting

> "Transfers between accounts. That's the fraud team's world, not mine, but it's the same shape as
> a lateral movement hunt -- who touched what, in what order. Fine."

> "Same three questions. Is this approved, where does it run, does it phone home. Left rail says
> 'Assistant. Off. Nothing is sent.' Okay, that's something, on one screen at least. It doesn't
> say where the file lives. In a real trial I'd stop and ask. It's a study, so I'll keep going.
> This is 'March transfers', 3,000 accounts, which I'm assuming is scrubbed sample data. I'm not
> putting bank data in here."

## Step 1 -- the inspector, two things selected

She opens the inspector page first.

> "This is proteins. TP53, BRCA1. Not accounts. Okay, the moderator said start from the first
> screen, so I'll read it as 'this is what selecting two things does'."

She scrolls to the state with two nodes selected.

> "Right column: '2 selected'. There's a button, 'Paths between...'. Good -- that's the words I'd
> look for. I'd click that."

The popout opens: "On: full graph, 300 nodes. Undirected." From, To, a swap button, "Weight by:
None: count hops", Run.

> "From and To filled in for me, in the order I clicked. Nice, I don't have to retype IDs. It tells
> me which graph it's searching and that it's undirected -- I like that it says so. Money has a
> direction, though. If A paid B, B didn't pay A. Where do I say 'follow the direction'?
> Undirected is stated but I don't see a switch to change it."

> "Weight by. The task says weighted by amount, so that's the dropdown. I'd open it and pick
> amount. The mock doesn't show me what's in the list, so I'm guessing it lists the edge columns."

She notes the popout has no mention of time.

> "No time range anywhere on this. 'Full graph' -- full graph of what dates? If this is a month, I
> want to see the month."

## Step 2 -- the sets-and-paths screen, the path tool

She moves to sets-and-paths, the transfers data.

> "Okay, now accounts. March transfers, 3,000 nodes. It's a gray hexagon blob -- a density map, I
> guess, because there are too many dots. Doesn't bother me, I don't care where the dots sit."

The third state: a bar under the canvas with From ACC-271813, To ACC-233575, Scope "Filtered
graph" with a warning icon, Weight "amount (unknown role)", Run greyed out, and a line: "From is
outside the filtered graph. Set Scope to Full graph to search it."

> "That's a good error. It tells me exactly why Run is grey and what to do. I've had tools just
> return nothing on a filtered view and I sat there thinking there was no path. I'd switch Scope
> to Full graph."

> "But -- 'amount (unknown role)'. What's an unknown role? It's a dollar amount. It's the amount of
> the transfer. I don't know what role you want from me. I'd leave it and hit Run and see what
> happens."

## Step 3 -- the found path

The fourth state: a three-hop path drawn with start and end badges. The right panel reads "Found
path (unweighted)", "Weight: amount (unknown role)", and under it "Paths ignore amount: hops were
counted, not dollars." Direction: "follows transfers". Ties: "1 of 2 as short". The table below
switches to Edges: step, source, target, amount -- $3,530.28, $9,782.05, $9,616.72.

> "Hold on. I picked amount. It says 'unweighted'. And then in small grey text: 'Paths ignore
> amount: hops were counted, not dollars.' So it ignored what I asked for and ran anyway. I'd
> rather it had refused like it did with the filter. At least then I'd know. If I hadn't read that
> grey line I'd have put 'weighted by amount' in my notes and it would be wrong."

> "Direction: follows transfers. Okay, so this one is directed. The first screen said undirected.
> Which is it? Probably depends on the data, but I want it said the same way in both places."

> "'1 of 2 as short.' So there's another three-hop path and it picked one. Which one did it pick,
> and why this one? I'd want both."

> "The table's the best thing on this screen. Step, source, target, amount, in path order. That's
> what I actually want to look at. Two of those three are just under ten grand. $9,782, $9,616.
> That's structuring-shaped -- under the $10,000 reporting line. That I'd flag. The graph didn't
> tell me that, the table did."

> "Where's the date? Step 1, step 2, step 3 -- 'step' is not a time. If step 2 happened before
> step 1, this isn't a chain, it's a coincidence. Money laundering, lateral movement, same thing:
> it's a sequence in time or it's nothing. I need the timestamp column."

She looks for a way to add a column to the edges table and does not find one on this screen.

## Step 4 -- trying to actually weight by amount

She clicks the Weight row, which opens the fifth state: "amount: what it means. Applies to every
result that reads amount. A bigger amount means: similarity: larger = closer. Read as a distance by
1/w, so a path prefers big transfers. Other conversions."

> "Okay. So this is the 'unknown role' thing. It wants to know if a big amount makes accounts
> closer or further. I get it now, but I only get it because I read it twice. 'Similarity'? It's
> money. I'd have said 'follow the big money'. And 1/w -- fine, I know what that is, my fraud
> colleague would not."

> "'Applies to every result that reads amount.' That worries me. I'm changing how amount is read
> for everything, not just this search? What else reads amount? What else changes when I pick
> this? I don't want to change something I'm not looking at."

> "And I actually don't know which one I want. 'Weighted by amount' -- do I want the path that
> moved the most money, or the path where the smallest transfer is biggest? Shortest by 1/amount
> isn't really 'the money trail', it's a trick. For fraud I'd want to know how much money could
> have moved from A to B. I'd pick 'similarity' because it's the default and move on."

She looks for what happens after choosing. The mock does not show the path re-run with amount
applied.

> "After I pick it, does the path re-run? Does 'unweighted' go away? I can't tell from here. I'd
> expect a Run button in this box or the path to update. Nothing tells me."

## Step 5 -- getting the transfers out

She goes to the bottom table page and finds "Getting rows out". The dock shows an "Export table as
CSV..." button next to the search icon. Its dialog lists Rows, Order, Columns, a preview of the
first lines of the file, and a file name. A second example shows a path row in the Edges tab:
"Selected: 5 edges on 2 paths" with source, target, hop, amount, on paths ("2 of 2", "1 of 2").

> "Export table as CSV. That's the right words, and it's right there on the table. The dialog
> tells me how many rows it will write and shows me the first lines of the file. That's exactly
> what I want -- I can check the header before I drop it into Splunk. Good."

> "And this one's better than the path screen: it's got both equal paths, five transfers, and 'on
> paths' says which transfer is on both. That's the 'show me both' I wanted a minute ago."

> "Still no date. Source, target, hop, amount, on paths. The task says amounts and dates. If the
> file has a timestamp, it's not in the table, and the dialog says 'every column', so I have to
> assume there's no date to export. I'd export this, open my notebook, and join it back to the
> raw transfers on source and target to get the times. Which is the work I was hoping not to do."

> "And 'hop' is not a time. I keep saying it."

## After the task

**Single Ease Question: 3 out of 7.**

> "Finding a connection was easy -- 'Paths between' is where I'd look, the From and To come in
> already filled, and the error about the filter was actually useful. Getting it weighted by
> amount, I'm not sure I ever did. It told me in grey text it ignored amount, and then asked me a
> question about similarity that I only half understood. And the dates just aren't there."

**Would she use this instead of her current tool?**

> "Not for this. For 'how are these two accounts connected and show me the transfers', I'd write a
> query in the notebook: filter transfers, networkx shortest path, done, and I have every column
> including the timestamp. What this does better is show me both equal paths at once and give me
> the edge rows in hop order without code. If it gave me the dates in that edge table, sorted by
> time, and just said up front 'this search counts hops, not money -- pick what money means to
> weight it', I'd use it to show a finding to my lead. Right now I'd have to fix the output in my
> notebook anyway, so why start here."

## Problems observed

| Where | What happened | Severity (1 minor -- 4 blocks the task) |
| --- | --- | --- |
| Path bar and found path (sets-and-paths) | She chose amount as the weight; the path ran unweighted anyway. The only sign was a small grey line under the Weight row. She would have recorded the result as weighted. | 4 |
| Edges table and CSV export (sets-and-paths, table-dock) | No date or time column on transfers anywhere; "step" and "hop" are path order, not time. The task's "dates" cannot be met; she plans to re-join in her notebook. | 4 |
| Weight-meaning popover (sets-and-paths) | "amount (unknown role)" and "similarity: larger = closer" are not words she would use for money; she understood only on a second read and could not tell which choice matches "weighted by amount". | 3 |
| Weight-meaning popover (sets-and-paths) | "Applies to every result that reads amount" made her worry the choice would change results she was not looking at, with no list of what else reads amount. | 2 |
| Weight-meaning popover (sets-and-paths) | No visible next step after choosing a meaning: no Run, no sign the path would update or that "unweighted" would go away. | 3 |
| Paths between popout (inspector) vs found path (sets-and-paths) | The inspector states "Undirected" with no way to change it; the transfers path says "follows transfers". She could not tell whether direction is a choice or a property of the data. | 2 |
| Found path (sets-and-paths) | "1 of 2 as short" picks one path without saying why; the table-dock example shows both, so the two screens disagree. | 2 |
| Paths between popout and path bar | No time range shown for "Full graph"; she cannot tie the result to a period. | 2 |
| Left rail | "Nothing is sent" is shown, but nothing says where the data lives or that it runs locally. | 1 |

## What she liked

- "Paths between..." appears on the selection with From and To already filled in.
- The filtered-scope error said exactly why Run was disabled and how to fix it.
- The edges table in path order with amounts -- the table, not the drawing, showed the two
  just-under-$10,000 transfers.
- "Export table as CSV..." states the row count and previews the file's first lines before writing.
- The table-dock example that lists every transfer on both equal paths with an "on paths" count.
