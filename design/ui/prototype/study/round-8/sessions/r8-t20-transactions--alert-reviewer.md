# Session: transfers of 1,000 or more -- Nadia (level-1 alert reviewer)

Task as given: "A month of card transfers between accounts is open. If you do not work in banking,
this is example data, not your own. You want every count and every drawing from now on to include
only transfers of 1,000 or more. Set that up, then say how many accounts are left."

Start screen: shots/tasks/r8-t20-transactions/01.png. Renders: tmp/round-8-sessions/r8-t20-transactions--alert-reviewer/01-08.png.
All commands run from design/ui/prototype; prefix each with
`timeout 120 node app-b/study.mjs --try tmp/round-8-sessions/r8-t20-transactions--alert-reviewer/NN.png task:r8-t20-transactions`.

## Steps

0. Start screen. "Transfers, March. I want only transfers of a thousand or more. There is a funnel
   up top that says 'Full graph'. Funnel means filter. Trying that."

1. `--click "Full graph"` (01.png)
   It moved me to a Data page with a Filters box: "Filters change what is computed; the eye in the
   Graph tree only hides." "Good -- that is the thing I always worry about, whether I changed the
   data or only the view. I want the counts to change, so this is the one. Add filter step."

2. `... --click "Add filter step"` (02.png)
   Right side shows "New step", "Keep: Pick one" with a menu: by an attribute or computed value,
   top of a computed value, largest component, k-core, neighbors of the selection. "Amount is an
   attribute. First one." (I did not know what k-core is and did not care.)

3. `... --click "By an attribute or computed value"` (03.png)
   A list split into accounts, transfers, computed values. "Under transfers: amount. That is mine."

4. `... --click "amount"` (04.png)
   I ended up on the amount column's info page instead of my filter step; the step still had no
   attribute. "That is not what I clicked for. The word 'amount' is on the left list too and it
   took that one." Restarted.

5. `... --click "amount, in use: Weight, transfers"` (05.png)
   Filter step now reads "amount is at least" with an empty box. "It already picked 'is at least'.
   Nice, less to do. The note says it keeps the transfers that pass and the accounts at their ends.
   That is what I want."

6. `... --type "1000" --key Enter` (06.png)
   Step title: "amount is at least 1000", "812 of 3,000 nodes (the full graph)". Top bar funnel now
   says "812 of 3,000 nodes". "Nodes are accounts here. 812. But the picture in the middle is the
   same blob as before. Did the drawing take it?"

7. `... --click "Graph"` (07.png)
   Summary: Nodes 812 of 3,000 -- but Edges still "9,113 transfers", highest degree still 907. Gray
   bar: "5 readings are for all 3,000 nodes -- Compute on 812." "So half the numbers are still the
   old ones. I said every count. Why do I have to press a second button for that?"

8. `... --click "Compute on 812"` (08.png)
   Density, weak components (4), average degree 3.47, highest degree 211, and more readings now
   appear. Edges line STILL says "9,113 transfers, each a distinct pair". "812 accounts at about
   3.5 links each is something like 1,400 transfers, not 9,113. Either that line is stale or I do
   not understand it. QA would ask which number I trust." Picture still looks identical to the
   start screen.

Stopped here.

## Answer given

812 accounts are left.

## Did I succeed?

Mostly, I think. The filter is on and the account count is 812 in three places (top bar, filter
step, summary). I am not sure about "every drawing": the picture never visibly changed, and nothing
told me whether it now shows only the 812. I am also not sure about "every count": the transfers
count still says 9,113 even after I pressed the recompute button.

## Single Ease Question

5 of 7. Building the filter itself was quick once I found it -- funnel, add step, amount, at least,
1000. What cost me: clicking "amount" once landed on the wrong thing, and then having to press a
second button to get the rest of the numbers updated, with one number still not updated.

## Would I use this instead of my current tool?

Not for clearing alerts; my current tool for totals is a spreadsheet, and filtering a column to
>= 1000 there takes ten seconds and every number on the sheet obeys it. Here the account count was
right but one count stayed old and the picture gave no sign it changed, so I could not put a
screenshot of it in an alert file and say "this is only the 1,000-plus transfers" without someone
asking me to prove it. If the picture visibly changed and every number followed the filter without a
second button, I would consider it for the few alerts where counterparties matter.

## Problems noticed (her words, condensed)

- After filtering, "Edges: 9,113 transfers" never changes, even after "Compute on 812". Contradicts
  the other readings.
- Counts other than nodes need a separate "Compute on 812" press; the task asked for every count.
- The drawing looks identical before and after the filter; no visible sign it applies.
- "amount" appears both in the filter's picker and in the left attribute list; one click landed on
  the attribute's info page and the filter stayed empty.

## Good

- The funnel in the top bar went straight to filters and then showed the live count ("812 of 3,000
  nodes"), so the answer was always in view.
- The line "Filters change what is computed; the eye only hides" answered the data-versus-view
  question before I asked it.
- "is at least" was preselected for a number column.
