# Session: filter transfers to 1,000 or more -- fraud analyst (Sarah)

Task as given: "A month of card transfers between accounts is open. If you do not work in banking,
this is example data, not your own. You want every count and every drawing from now on to include
only transfers of 1,000 or more. Set that up, then say how many accounts are left."

Mode: first impression, not mandated. Start screen: shots/tasks/r8-t20-transactions/01.png.
All commands run from design/ui/prototype. Renders in
tmp/round-8-sessions/r8-t20-transactions--fraud-analyst/.

PREFIX below = `timeout 120 node app-b/study.mjs --try <render dir>/NN.png task:r8-t20-transactions`

## Start screen

"Transfers, March 2026. A gray blob of hexagons, 3,000 nodes, 9,113 transfers. Up top there is a
button with a funnel that says 'Full graph'. A funnel is a filter. That's where I'd start."

## 01 -- click the funnel

    PREFIX --click "Full graph"

"It took me to a Data page: two CSVs, then a Filters box. 'No filters. Filters change what is
computed; the eye in the Graph tree only hides.' Fine -- I want the counts to change, not just
hide dots. 'Add filter step'."

## 02 -- add a filter step

    PREFIX --click "Full graph" --click "Add filter step"

(The tool noted two controls named "Add filter step"; it clicked the first.)

"New step. Keep: pick one. 'By an attribute or computed value', 'Top of a computed value',
'Largest component', 'k-core'. I don't know what a k-core is and I'm not clicking it. Amount is a
column on the transfers, so the first one."

## 03 -- by attribute

    PREFIX ... --click "By an attribute or computed value"

"A list split into accounts and transfers. Under transfers: amount, marked Weight. Click amount."

## 04 -- amount (landed on the wrong one)

    PREFIX ... --click "amount"

(The tool noted two controls named "amount"; it clicked the row in the left panel, not the menu.)

"That's a details page for the amount column -- a histogram, 9,113 transfers, average 1,553.44.
Useful actually, but it's not my filter. The filter step is still on the left with no condition.
The word 'amount' is in two places on the screen at once and I hit the wrong one."

## 05 -- amount from the menu

    PREFIX ... --click "amount, in use: Weight, transfers"

"OK: 'amount is at least [ ]'. Empty box. It even guessed 'at least', which is what I want. And
it says in plain words that it keeps the transfers that pass and the accounts at their ends.
Good -- that's the right reading for a flow-of-funds filter."

## 06 -- type 1000

    PREFIX ... --type "1000" --key Enter

"amount is at least 1000. '812 of 3,000 nodes'. The top button now says '812 of 3,000 nodes'
too. Nodes are accounts here, so 812 accounts. But the picture in the middle hasn't changed at
all. Same blob. Did it filter the drawing or not? And how many transfers survived? It doesn't
say."

## 07 -- back to the summary

    PREFIX ... --click "Graph"

"Summary: Nodes 812 of 3,000. Edges: 9,113 transfers. A gray strip: '5 readings are for all
3,000 nodes -- Compute on 812'. So half the panel is the old data and half is new. That's
exactly the kind of number I can't put in a case file. Press the button."

## 08 -- compute on 812

    PREFIX ... --click "Compute on 812"

"Now density, components (4), average degree (3.47), highest (211) all moved. But Edges STILL
says 9,113 transfers. That can't be right: if every transfer under 1,000 is gone the transfer
count has to drop. Average degree halved, so I'd guess about 1,400 transfers left, not 9,113.
And the drawing is still the full 3,000-account blob. The task was 'every count and every
drawing'. The account count changed; the transfer count and the drawing didn't."

Stopped here.

## Answer

812 accounts.

## Did I succeed?

Mostly. The filter is set and the account count is 812, shown in three places, all agreeing.
But I'm not confident the filter applies to "every count and every drawing": the transfer count
stayed at 9,113 and the picture never changed. I'd export and check in Excel before I trusted it.

## Single Ease Question

4 of 7. Setting the filter itself was easy -- funnel, add step, amount, at least, 1000. Two
things cost me: clicking "amount" hit the column list on the left instead of the menu I was
picking from, and afterward the screen disagreed with itself (812 accounts but 9,113 transfers,
a picture that never moved, a separate "Compute on 812" button I had to find).

## Would I use this instead of my current tool?

Not for this. In Excel this is one filter on the amount column and a distinct count of
accounts, ten seconds, and every number on the sheet obeys the filter. Here the filter
step itself is clearer than i2's, and I like that it says in words that it keeps
the accounts at the ends of the passing transfers. But a tool where the account count obeys the
filter and the transfer count doesn't is a tool whose numbers I have to re-check, and then it
saved me nothing.

## Problems seen

1. After the filter, Edges still reads "9,113 transfers" even after "Compute on 812" -- the
   transfer count does not follow the filter (render 08). Severity high.
2. The drawing does not change when the filter is applied; the same 3,000-node picture stays
   (renders 06-08). The task asked for every drawing to follow the filter. Severity high.
3. The summary shows mixed old and new numbers until a separate "Compute on 812" is pressed;
   the analyst asked for every count to follow the filter, and nothing said the filter alone
   would not do it (render 07). Severity medium.
4. "amount" appears in the attribute menu and in the left-hand column list at the same time;
   clicking it opened the column's details instead of filling the filter (render 04).
   Severity medium.
5. Two controls named "Add filter step" on one screen (the plus and the link). Severity low.
