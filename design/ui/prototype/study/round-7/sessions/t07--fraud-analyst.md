# Session: keep only transfers of 1,000 or more -- Sarah, fraud analyst

Task as given: "From now on you only care about transfers of 1,000 or more. Make every count,
drawing and later calculation describe only those, then say how many accounts are left and
whether the summary numbers on screen describe what is left."

Mode: not mandated (first-impression patience, about five minutes).
All commands run from design/ui/prototype. Renders in tmp/round-7-sessions/t07--fraud-analyst/.

## Start screen (shots/tasks/t07/01.png)

"Transfers, March 2026. 3,000 accounts, 9,113 transfers. Fine. A big gray blob of hexagons in
the middle -- that's the hairball, I can't read anything off it. I need a filter. Top bar says
'Full graph' with a funnel icon. Funnel means filter. Clicking that."

## Step 1 -- the funnel

    timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t07--fraud-analyst/01.png task:t07 --click "Full graph"

"Huh. It jumped me to a Data panel and there's already a filter in it: 'amount is at least
1,000', ticked, '812 of 3,000 nodes'. I didn't type 1,000 anywhere. Somebody set this up for
me, or it guessed. I'll take it, but I'd want to know where it came from.

Top chip now says 812 of 3,000 nodes. So 812 accounts are left. Right side Summary: Nodes 812
of 3,000 -- good. Edges 9,113. That's ALL the transfers. If I kept only transfers of 1,000 or
more, it can't still be 9,113. And density 0.00101, highest degree 907 -- same numbers as the
start screen. There's a little bar: '5 readings are for all 3,000 nodes -- Compute on 812'. At
least it admits it. And the picture -- the blob looks exactly the same. Nothing dropped out."

## Step 2 -- try to make the summary describe what is left

    timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t07--fraud-analyst/02.png task:t07 --click "Full graph" --click "Compute on 812"

"I pressed 'Compute on 812' and I got a menu instead: Select all visible, Re-run layout,
Reshuffle layout seed, Unpin all, Compute the overview, Clear graph data... That's not what I
pressed. Let me try again."

    timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t07--fraud-analyst/03.png task:t07 --click "Full graph" --click "Compute"

"Same menu. OK, there's 'Compute the overview' in it. Maybe that's the same thing."

    timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t07--fraud-analyst/04.png task:t07 --click "Full graph" --click "Compute on 812" --click "Compute the overview"

"What? The right panel now says 'Co-appearances, from miserables.gexf', 77 nodes, 254 edges,
undirected. That's not my data. My filter on the left still says 812 of 3,000 and the title
still says Transfers, March 2026. So which numbers am I looking at? I would never put a number
from this screen in a case file after that. That alone is a stop for me."

## Step 3 -- check what the filter actually did

    timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t07--fraud-analyst/05.png task:t07 --click "Full graph" --click "amount is at least 1,000"

"Clicked the filter line. Right side: 'amount >= 1,000', 'amount is on edges: this step keeps
the transfers that pass and the accounts at their ends.' Good, that's the sentence I wanted --
it filters transfers, and keeps the accounts on either end. 812 accounts. But it never tells me
how many TRANSFERS passed. I asked about transfers. It only counts accounts."

## Step 4 -- look at the transfers themselves

    timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t07--fraud-analyst/06.png task:t07 --click "Full graph" --click "Edges"

"The table at the bottom: '9,113 edges (before the filter)'. First rows are 5.04, 8.97, 44.6,
38.0, 14.8 -- all under 1,000. Sum of amount, all 9,113 rows: 14,156,522. So the table is the
whole month, not my filter. At least it says 'before the filter' -- honest -- but I can't get
the filtered list out of it, and I can't get the total of the 1,000-plus transfers, which is
the first number my reviewer would ask for."

    timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t07--fraud-analyst/08.png task:t07 --click "Full graph" --click "Edges" --click "Weight"

"Tried to get at weight/sort. Nothing changed."

## Step 5 -- one more go at the summary

    timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t07--fraud-analyst/07.png task:t07 --click "Full graph" --click "5 readings are for all 3,000 nodes"
    timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t07--fraud-analyst/09.png task:t07 --click "Full graph" --hover "Compute on 812"

"Clicking the warning text does nothing. Hovering the button shows no tooltip. Summary still
says Edges 9,113, highest degree 907."

## Step 6 -- the top chip

    timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t07--fraud-analyst/10.png task:t07 --click "Full graph" --click "812 of 3,000 nodes"

"Clicked the '812 of 3,000 nodes' chip at the top, expecting it to show me the filter. It did
-- but now there are TWO steps: 'amount is at least 1,000' and 'kind is not merchant', both
ticked, '2 steps, 2 on'. I never added 'kind is not merchant'. And a little speech bubble with
a '1' appeared on my filter. If I hadn't been looking I'd have dropped every merchant account
from the case without knowing. That's the kind of thing that gets a SAR kicked back."

I stop here.

## Verdict

- Did I succeed? Partly. I can say 812 accounts are left. I can say the summary does NOT fully
  describe what is left: the node count does, but the transfer count (9,113), density, highest
  degree and the chart are still the whole month, the table says "before the filter", and the
  picture didn't visibly change. I could not make the summary or the table describe only the
  1,000-plus transfers. The button meant for that opened a menu, and the item in that menu
  swapped the summary to a different dataset entirely.
- Single Ease Question: 2 out of 7.
- Would I use this instead of my current tool? No. In Excel this is one filter on the amount
  column and the count, sum and pivot all follow it. Here half the numbers follow the filter and
  half don't, one control loaded someone else's data into the summary, and another quietly added
  a filter I didn't ask for. I can't put numbers I can't trust in a case file. What I did like:
  the filter sentence that says it keeps the transfers and the accounts at their ends, and the
  "before the filter" and "5 readings are for all 3,000 nodes" labels -- the tool at least tells
  you when it's stale. Now make the button that fixes it work.
