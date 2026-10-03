# Session: card transfers, keep only 1,000 and up -- Dana Okafor (supply chain risk analyst)

Task as given: "A month of card transfers between accounts is open. If you do not work in
banking, this is example data, not your own. You want every count and every drawing from now on
to include only transfers of 1,000 or more. Set that up, then say how many accounts are left."

All commands were run from design/ui/prototype. Renders are in
tmp/round-8-sessions/r8-t20-transactions--supply-chain-analyst/. Abbreviation below:
TRY = `timeout 120 node app-b/study.mjs --try <render> task:r8-t20-transactions`.

## Start screen (shots/tasks/r8-t20-transactions/01.png)

"OK, not my data, fine -- it's like a supplier list with payments between them. 3,000 nodes,
9,113 transfers. Big grey blob in the middle, which tells me nothing, as usual. What I want is a
filter. Top bar has a button that says 'Full graph' with a funnel icon. Funnel means filter in
Excel. I'll click that."

## Step 1 -- the funnel button

    TRY 01.png --click "Full graph"

"It switched the left side to 'Data' and there's a 'Filters' section: 'No filters. Filters change
what is computed; the eye in the Graph tree only hides. Add filter step.' I read the first bit --
'change what is computed' -- that sounds like what I want, the counts need to change. The eye
thing I skipped. Clicking 'Add filter step'."

## Step 2 -- add a step

    TRY 02.png --click "Full graph" --click "Add filter step"

(The tool noted two controls named "Add filter step"; it clicked the first.)

"Menu: 'By an attribute or computed value', 'Top of a computed value', 'Largest component',
'k-core'... I don't know what k-core is and I'm not touching it. 'Attribute' is a column, I
think. The amount is a column. First one."

## Step 3 -- pick a column

    TRY 03.png --click "Full graph" --click "Add filter step" --click "By an attribute or computed value"

"A list of columns, grouped by the two files. Under 'transfers' there's 'amount', with 'Weight'
next to it. I don't care what Weight means right now. Clicking amount."

    TRY 04.png ... --click "amount"

"Hm, that opened a page about the amount column -- a histogram, 'Read as Number', 'Role: Weight'.
Not my filter. Did I click the wrong 'amount'? There are two on screen, one on the left and one in
the menu. I'll go back and click the one in the menu."

(Simulation note: the plain "amount" matched the left-side attribute row first. Dana meant the
menu row, so the next run names the menu item exactly.)

    TRY 05.png ... --click "amount, in use: Weight, transfers"

"There we go. 'amount' -- 'is at least' -- and an empty box. It already guessed 'at least', which
is what I wanted. Nice, that's one less dropdown. It says it keeps the transfers that pass and
the accounts at their ends. Good, that's the right idea: accounts with no big transfers drop
out."

## Step 4 -- type the threshold

    TRY 06.png ... --type "1000" --key Enter

"Typed 1000, Enter. Top button now says '812 of 3,000 nodes'. The left side says
'amount is at least 1000 -- 812 of 3,000 nodes (the full graph)'. So 812 accounts.

But the picture hasn't moved. It's the same blob. Is it drawing only the 812 or is it still all
3,000? I can't tell from looking at it. The task says every drawing."

## Step 5 -- check the counts

    TRY 07.png ... --click "Graph"

"Summary on the right: 'Nodes 812 of 3,000 nodes'. But there's a grey bar: '5 readings are for all
3,000 nodes -- Compute on 812'. So some of the numbers on this panel are still the old ones?
Edges still says 9,113 transfers. That can't be right if I just threw out the small ones. I'll
press 'Compute on 812' -- I said every count."

    TRY 08.png ... --click "Graph" --click "Compute on 812"

"Now density changed, 'Weak components 4', highest degree 211 instead of 907. OK, those were
recomputed. But Edges STILL says '9,113 transfers'. Either it didn't recompute that one, or the
filter didn't drop any transfers -- and it told me it keeps only the transfers that pass. So which
number do I trust? This is exactly the thing I hate: two numbers on one screen disagreeing.

And I had to press a button to get the counts to follow my filter. I asked for every count from
now on. Will it remember next time, or do I have to press 'Compute' every time I change
something? I don't know.

The drawing still looks identical."

## Step 6 -- back to the filter, to double-check

    TRY 09.png ... --click "Graph" --click "812 of 3,000 nodes"

(The tool noted two controls named "812 of 3,000 nodes"; it clicked the top-bar button.)

"Back on Filters. Now the step says 'amount >= 1,000' and on the right: 'This step 1,204 of 9,113
edges, 812 of 3,000 nodes'. So 1,204 transfers survived. Then why did the summary say 9,113?

And wait -- there are two steps now. 'kind is not merchant', ticked on, under mine. I did not add
that. Where did it come from? It says 'Kept all 812 nodes: the steps above left nothing for it to
remove', so it isn't changing my answer, but I didn't put it there. My step also says '1 note' --
I didn't write a note either. If a tool adds filters I didn't ask for, I stop trusting every
number after. I'd leave it alone, because it says it removes nothing, but I'd want to know who
put it there before I showed this to anyone."

## Where I stop

"812 accounts. That's my answer. The filter is there, it's ticked, and the top button says
812 of 3,000 nodes. I'm stopping here."

## Wrap-up

- **Succeeded?** I think so: 812 accounts are left with a transfer of 1,000 or more. Fairly sure
  on the 812, since three places agree. Not sure the drawing is filtered -- it looked the same
  before and after -- and not sure all the counts follow, because the edge count on the summary
  stayed at 9,113 after I recomputed while the filter itself says 1,204.
- **Single Ease Question:** 4 of 7. Setting up the filter was quick -- funnel button, add step,
  amount, at least, 1000. The 'is at least' default was a nice touch. What cost me was
  afterwards: the separate 'Compute on 812' button, the edge count that never changed, the picture
  that never changed, and a second filter step and a note I didn't create.
- **Would I use this instead of my current tool?** Not for this. In Excel this is a filter on the
  amount column and a COUNTUNIQUE on the two account columns -- two minutes, and every number on
  the sheet agrees with every other one. The one thing this does that Excel doesn't is keep the
  filter as a named step I can switch on and off, and tell me how many each step removed; that
  part I'd actually like for "suppliers over X spend". But I'm not putting a number in front of my
  VP from a screen where the summary says 9,113 transfers and the filter says 1,204. And the usual
  questions still stand: where does the data go (it does say 'Local only' at the top, which I
  noticed and which would help with IT), and can I get the 812 out into Power BI.

## Problems observed

1. Summary "Edges" still reads 9,113 transfers after the filter and after "Compute on 812",
   while the filter step reports 1,204 of 9,113 edges. Contradictory counts on the same app.
2. The drawing looked identical before and after the filter; nothing told her whether it showed
   812 or 3,000 accounts.
3. Counts did not follow the filter until she pressed "Compute on 812"; it was not clear whether
   that has to be pressed again after every change, which defeats "every count from now on".
4. A second step, "kind is not merchant", and "1 note" on her step appeared without her adding
   them. She read it as the tool changing her filter behind her back.
5. Two controls both called "amount" (left list and the menu); the first click opened the column
   page instead of choosing it for the filter.
6. Two controls called "Add filter step" on the Data page.

## Things that worked

- The funnel "Full graph" button in the top bar went straight to Filters.
- "is at least" was already chosen when she picked a number column.
- The step's own line says in plain words what it kept: "812 of 3,000 nodes", "1,204 of 9,113
  edges", and a later step says it removed nothing.
- "Local only" in the top bar.
