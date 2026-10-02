# Session: transfers of 1,000 or more -- Dana Okafor, supply chain risk analyst

Task as given: "From now on you only care about transfers of 1,000 or more. Make every count,
drawing and later calculation describe only those, then say how many accounts are left and
whether the summary numbers on screen describe what is left."

Treated as: accounts = my suppliers and customers, transfers = shipments / purchase orders
between them. "Only POs of 1,000 or more" is a normal thing for me to ask.

All commands run from design/ui/prototype. Renders are in
tmp/round-7-sessions/t07--supply-chain-analyst/.

## Start screen (shots/tasks/t07/01.png)

Big gray blob of hexagons. Right side says Nodes 3,000, Edges 9,113, a lot of words I skip
(density, reciprocity, "weak components"). Top bar has "Local only" -- good, I hope that means
my data stays on my laptop, that's the first thing IT will ask. Next to it: a funnel icon and
"Full graph". A funnel means filter in Excel. That's my button.

## Step 1 -- click the funnel

    timeout 120 node app-b/study.mjs --try .../01.png task:t07 --click "Full graph"

What I saw: the left panel switched to "Data" and there is a Filters list with ONE step already
in it: "amount is at least 1,000 -- 812 of 3,000 nodes", ticked. The top chip now says
"812 of 3,000 nodes".

Thinking aloud: Wait. I didn't type 1,000. I clicked a funnel and it already knew my number?
Fine for a demo, but I didn't set it, so I'm not sure what else it set. In real life I'd want to
type the 1,000 myself.

Then the right side. Nodes "812 of 3,000". Edges 9,113 -- same as before. Highest total degree
907 -- same as before. Density same. A gray bar at the top says "5 readings are for all 3,000
nodes" with a button "Compute on 812". OK, so it is telling me, honestly, that these numbers are
still the old ones. I appreciate that it says so. But why would I ever want the old ones once I
filtered? In Power BI the card just updates.

And the picture: as far as I can tell it is the exact same blob. Nothing faded, nothing went
away. If I put this on a slide nobody would know I filtered anything.

## Step 2 -- press "Compute on 812"

    timeout 120 node app-b/study.mjs --try .../02.png task:t07 --click "Full graph" --click "Compute on 812"

What I saw: a menu popped up over the right panel -- "Select all visible, Invert selection,
Fit, Re-run layout, Reshuffle layout seed, Unpin all, Compute the overview, Add node, Add note,
Clear graph data". That's not what I clicked. I wanted the numbers updated, not a menu.

## Step 3 -- try "Compute the overview" from that menu, since it sounds the same

    timeout 120 node app-b/study.mjs --try .../03.png task:t07 --click "Full graph" --click "Compute on 812" --click "Compute the overview"

What I saw: the right panel now says "Co-appearances, from miserables.gexf". Nodes 77,
Edges 254, "Undirected". The left side still says my transfers files and my filter.

Thinking aloud: That is not my data. 77 of what? Where did my 812 go? This is the moment I stop
trusting every number on the screen. If I can't tell which file the summary is about, I can't
use the summary. I backed out.

## Step 4 -- open the filter step itself to see what it actually does

    timeout 120 node app-b/study.mjs --try .../04.png task:t07 --click "Full graph" --click "amount is at least 1,000"

What I saw: right side "amount >= 1,000, Filter step". Condition: amount / is at least / 1,000
in a box I could edit. A line: "amount is on edges: this step keeps the transfers that pass and
the accounts at their ends." "This step 812 of 3,000 nodes."

Thinking aloud: Good, that line I actually read, because it's one sentence and it answers my
question: it keeps the big transfers and the accounts on either end. So 812 accounts touch at
least one transfer of 1,000+. That's the number the task wants. But it tells me accounts, not
how many transfers are left -- and transfers are the thing I filtered.

## Step 5 -- look at the transfers table, where I trust things

    timeout 120 node app-b/study.mjs --try .../05.png task:t07 --click "Full graph" --click "Edges"

What I saw: table opens at the bottom: "9,113 edges (before the filter)". First rows have amount
5.04, 8.97, 44.6, 38.0, 14.8. Footer: "Sum of amount, all 9,113 rows: 14,156,522".

Thinking aloud: So the table ignores my filter. The rows on top are exactly the small ones I said
I don't care about. The sum at the bottom is for everything. If I export this I export the
wrong list. At least it says "(before the filter)" so it isn't lying, but it is not what I
asked for: "every count ... describes only those". I'd have to go to Excel and filter it again,
which is what I do today.

## Step 6 -- try "Compute on 812" again, with the table open

    timeout 120 node app-b/study.mjs --try .../06.png task:t07 --click "Full graph" --click "Edges" --click "Compute on 812"

Same menu pops up again. And now the table flipped back to the accounts tab: "3,000 nodes (before
the filter)", columns "Links in (count, full graph)". Also full graph.

## Step 7 -- close the menu and look at the summary

    timeout 120 node app-b/study.mjs --try .../07.png task:t07 --click "Full graph" --click "Compute on 812" --key Escape

What I saw: the button has a blue outline now, like it got clicked, but nothing changed: still
"5 readings are for all 3,000 nodes", Edges 9,113, Highest degree 907. So the button doesn't
do anything I can see.

## Step 8 -- click the "812 of 3,000 nodes" chip at the top

    timeout 120 node app-b/study.mjs --try .../08.png task:t07 --click "Full graph" --click "812 of 3,000 nodes"

What I saw: it opened the same filter step. But the filter list now has TWO steps: my amount one
(with a little "1" speech bubble next to it) and a new one, "kind is not merchant -- kept all
812 nodes", also ticked.

Thinking aloud: I did not add "kind is not merchant". Something added a filter I didn't ask for.
It says it kept all 812, so it didn't hurt this time, but things changing by themselves is exactly
what I don't accept in a tool I show a VP. I'm stopping here.

## My answer to the moderator

- Accounts left: 812 of 3,000 (accounts at either end of a transfer of 1,000 or more). That's
  what the filter step and the top chip say.
- Do the summary numbers describe what is left? No. Only the node count does. Edges (9,113),
  density, highest degree (907) and the rest are still the full month -- the app itself says
  "5 readings are for all 3,000 nodes". The "Compute on 812" button didn't update them for me;
  it popped up a menu, and one item in that menu put a completely different dataset's summary
  (77 nodes, miserables.gexf) on the screen.
- Drawing: I could not see any change. Same blob before and after.
- Transfers table: still all 9,113 transfers, "before the filter", small ones on top.
- How many transfers are left: I never found out.

## Did I succeed?

Partly. I got the accounts number (812) and I can say the summary doesn't describe it. But I
could not make "every count, drawing and later calculation" describe only the big transfers --
the table, the picture and most of the summary still show everything.

Single Ease Question: 3 out of 7. Filtering itself was one click (too easy, almost -- it filled
in my 1,000 without me). Making the rest of the screen agree with the filter I couldn't do.

## Would I use this instead of what I use now?

No, not for this. In Excel or Power BI, one slicer and every card, table and chart on the page
follows it. Here the filter changes one number and a chip, and everything else stays on the full
graph unless I press something -- and when I pressed it I got a menu and someone else's data.
Things I did like: "Local only" up top (that's my IT conversation), and the one-sentence
explanation in the filter step of what it keeps, and the honest "(before the filter)" labels --
at least it didn't pretend. But a summary that sits there showing old numbers next to a
filtered count is a slide waiting to go wrong. And I still need to know: can I get the filtered
list out to Power BI?
