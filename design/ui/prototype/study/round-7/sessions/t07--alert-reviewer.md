# Session: keep only transfers of 1,000 or more -- Nadia, level-1 alert reviewer

Task as given: "From now on you only care about transfers of 1,000 or more. Make every count,
drawing and later calculation describe only those, then say how many accounts are left and whether
the summary numbers on screen describe what is left."

Start screen: shots/tasks/t07/01.png. All renders are in tmp/round-7-sessions/t07--alert-reviewer/.
Every command was run from design/ui/prototype.

## Step 1 -- start screen (01.png)

Think-aloud: "Graph of 3,000 accounts, 9,113 edges. I want a filter. At the top there's a funnel
icon that says 'Full graph'. That's the closest thing to a filter, so I'll click it."

## Step 2 -- click "Full graph" (02.png)

    timeout 120 node app-b/study.mjs --try .../t07--alert-reviewer/02.png task:t07 --click "Full graph"

Seen: the Data panel opened. Under Filters there's already a step, "amount is at least 1,000",
checked, "812 of 3,000 nodes". The top chip now reads "812 of 3,000 nodes". A banner on the right
says "5 readings are for all 3,000 nodes" with a button, "Compute on 812". Summary: Nodes "812 of
3,000", Edges 9,113.

Think-aloud: "Wait, I didn't type 1,000. Someone already built this, or clicking the funnel switched
it on. Lucky, it's the one I want. But the summary still shows 9,113 edges. If I only keep transfers
of 1,000 or more, shouldn't the number of transfers go down? And the picture looks identical. The
banner admits the numbers are for all 3,000, so I'll press Compute."

## Step 3 -- click "Compute on 812" (03.png)

    ... --click "Full graph" --click "Compute on 812"

Seen: a menu opened instead (Select all visible, Invert selection, Fit, Re-run layout, Compute the
overview, Add node..., Clear graph data). The button is mostly covered by the menu.

Think-aloud: "I didn't ask for a menu. Maybe I hit the dots next to the button."

## Step 4 -- Escape, then "Compute on 812" again (04.png)

    ... --click "Full graph" --click "Compute on 812" --key Escape --click "Compute on 812"

Seen: the same menu again.

Think-aloud: "Same thing. Every time I press the button I get this list. 'Compute the overview' is
the only thing in it that sounds like compute."

## Step 5 -- "Compute the overview" (05.png)

    ... --click "Full graph" --click "Compute on 812" --click "Compute the overview"

Seen: the right panel now says "Co-appearances, Graph from miserables.gexf", 77 nodes, 254 edges,
undirected, with one note. The left side still shows my transfers files and "812 of 3,000 nodes".
The picture is unchanged.

Think-aloud: "What? Co-appearances, miserables.gexf, 77 nodes? That's not my data at all. If I put
this screenshot in an alert file, QA sends it back. I don't trust that panel any more."

## Step 6 -- open the filter step itself (06.png)

    ... --click "Full graph" --click "amount is at least 1,000"

Seen: the right panel shows the step: amount / is at least / 1,000; "amount is on edges: this step
keeps the transfers that pass and the accounts at their ends"; This step "812 of 3,000 nodes".

Think-aloud: "OK, that's the sentence I needed. It keeps the transfers of 1,000 or more and the
accounts on either end of them. So 812 accounts. But it still doesn't say how many TRANSFERS are
left. Transfers are what I asked for."

## Step 7 -- open the transfers table (07.png)

    ... --click "Full graph" --click "Edges"

Seen: the table header says "9,113 edges (before the filter)". The first rows have amounts of 5.04,
8.97, 44.6, 38.0 and 14.8. The bottom line reads "Sum of amount, all 9,113 rows: 14,156,522". The
summary still says Edges 9,113 under the "5 readings are for all 3,000 nodes" banner. The picture
looks the same as at the start.

Think-aloud: "So the table isn't filtered, the picture isn't filtered and the totals aren't filtered.
Only the node counter changed. If I added these up for a report, I'd be adding the 5-dollar card
payments I said I didn't want. I'm stopping."

## Outcome

- Accounts left: 812 (of 3,000). I'm confident of that number.
- Do the summary numbers describe what is left? No. The banner says so itself ("5 readings are for
  all 3,000 nodes"), the summary still shows all 9,113 transfers, and the table says "before the
  filter". The one thing that should have fixed it, "Compute on 812", opened a menu for me twice,
  and the menu's "Compute the overview" showed a different dataset ("Co-appearances, from
  miserables.gexf").
- Drawing: I couldn't see any change in the picture.
- Did I succeed? Partly. I got the filter on and I can say 812 accounts. I could not make the counts,
  the drawing or the totals describe only the big transfers, and I'm not sure I ever will.

Single Ease Question (1 = very hard, 7 = very easy): 2.

Would I use this instead of my current tool? No. Today I filter the transaction pull to amount >= 1000
in the spreadsheet and the row count and the sum are right straight away. Here a filter changes one
counter, while the table, the totals and the picture still describe everything. The compute button
showed somebody else's graph. That would cost me minutes on every alert, and I'd have to explain the
screenshot to QA. The good part was the sentence that says the filter keeps the transfers and the
accounts at their ends. I'd want that sentence, plus "N transfers left", right next to the counter
at the top.
