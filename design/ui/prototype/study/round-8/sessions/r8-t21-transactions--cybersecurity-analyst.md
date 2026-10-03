# Session: money path between two accounts -- Priya (SOC threat hunter)

Task as given: "A month of card transfers between accounts is open, and the program has already
sorted the accounts into groups. If you do not work in banking, this is example data, not your own.
Work out how money could have gone from account ACC-271813 to account ACC-233575 through the
smallest number of other accounts: say which accounts are in between, whether there is more than
one such way, and whether the dates allow it."

All commands run from design/ui/prototype. Renders are in
tmp/round-8-sessions/r8-t21-transactions--cybersecurity-analyst/.
D below stands for that folder.

## Start screen (shots/tasks/r8-t21-transactions/01.png)

"Transfers, March 2026" -- fine, that is my time range, it's in the title. Good. "Local only" chip
up top, that's half my first question answered. Hairball in the middle colored by Louvain. I don't
care about the communities for this; this is a pivot question: A to B, fewest hops. Not my data,
so no approval drama -- in real life I'd be asking where this runs before anything else.

## Step 1 -- what does "Local only" mean

    timeout 120 node app-b/study.mjs --try D/01.png task:r8-t21-transactions --hover "Local only"

Tooltip: "Privacy settings". OK, so it's a setting, not a statement. I'd want one line that says
"runs in your browser, no network calls". Moving on.

## Step 2-3 -- ground truth: search for the start account

    timeout 120 node app-b/study.mjs --try D/02.png task:r8-t21-transactions --click "Find rows and notes"
    timeout 120 node app-b/study.mjs --try D/03.png task:r8-t21-transactions --click "Find rows and notes" --type "ACC-271813"

"No match for ACC-271813". That's the account the task named. Either the account isn't in the data
or the search box doesn't search account IDs. That's exactly the kind of thing that makes me not
trust a tool -- first check against ground truth and it says it doesn't exist. (Later the path tool
found it fine, so the search box is lying, or searching something else.)

## Step 4 -- hunt for a command/query box

Hovered the bottom toolbar icons (renders tmp-h660..tmp-h838 in D, all with --hover-at x,822):
Analyze, Layout, View, Legend, Quick actions Ctrl+K. Ctrl+K -- there's my box.

    timeout 120 node app-b/study.mjs --try D/04.png task:r8-t21-transactions --click "Quick actions" --type "path"

"Path between... The shortest or cheapest route between two nodes", shortcut P. Good. Typing beats
clicking.

## Step 5-7 -- fill in the path form

    timeout 120 node app-b/study.mjs --try D/05.png task:r8-t21-transactions --click "Quick actions" --type "path" --key Enter
    timeout 120 node app-b/study.mjs --try D/06.png task:r8-t21-transactions --click "Quick actions" --type "path" --key Enter --type "ACC-271813"
    timeout 120 node app-b/study.mjs --try D/07.png task:r8-t21-transactions --click "Quick actions" --type "path" --key Enter --type "ACC-271813" --key Enter --click "Click to pick" --type "ACC-233575" --key Enter

Form: From, To, Direction (Follow edges / Either way), "Follow time order" checkbox, Weight =
"amount (set at load)", Scope = whole graph, 3,000 accounts. From had focus, I typed the ID. No
dropdown confirming it matched anything -- I just have to hope. Enter moved me to To on its own (my
"Click to pick" click missed because the field had already filled), which is fine for a keyboard
person. Find path lit up, so I guess both IDs resolved.

Weight is set to amount. No. "Smallest number of other accounts" is hop count, not money. If I'd
missed that dropdown I'd have answered the wrong question -- the default is quietly the wrong one
for "fewest accounts".

## Step 8-9 -- hop count, run it

    timeout 120 node app-b/study.mjs --try D/08.png task:r8-t21-transactions --click "Quick actions" --type "path" --key Enter --type "ACC-271813" --key Enter --type "ACC-233575" --key Enter --click "amount (set at load)"
    timeout 120 node app-b/study.mjs --try D/09.png task:r8-t21-transactions --click "Quick actions" --type "path" --key Enter --type "ACC-271813" --key Enter --type "ACC-233575" --key Enter --click "amount (set at load)" --click "None (fewest steps)" --click "Find path"

"None (fewest steps)" -- that's what I want. Ran it.

Result bar: "3 steps. 2 routes tie. Dates in order. Route 1 of 2". Right panel has the hops in
order with dates and amounts:

- ACC-271813 (start) -> step 1, 3,530.28, 4 Mar
- ACC-946224 (via) -> step 2, 9,468.23, 7 Mar
- ACC-670564 (via) -> step 3, 9,399.31, 9 Mar
- ACC-233575 (end, personal, riskScore 98, flagged)

That right-hand table is the most useful thing I've seen: hops in order, with dates, with a "Dates
in order: Yes" column. That's my timeline. Also noticing 3,530 goes in to 946224 and 9,468 goes out
-- so 946224 is aggregating from somewhere else. Mule pattern smell. That's the next pivot.

The graph itself: I can't see the path. The path color is orange and Community 5 is also orange.
Nothing zoomed, nothing dimmed. If I had to screenshot this for the case it would be a hairball
with a legend entry that matches 139 other dots.

## Step 10 -- second route

    timeout 120 node app-b/study.mjs --try D/10.png task:r8-t21-transactions --click "Quick actions" --type "path" --key Enter --type "ACC-271813" --key Enter --type "ACC-233575" --key Enter --click "amount (set at load)" --click "None (fewest steps)" --click "Find path" --click "Next route"

(Tool said two "Next route" buttons exist -- one in the bottom bar, one in the panel. Same thing,
two places.)

Route 2 of 2:

- ACC-271813 -> step 1, 3,530.28, 4 Mar
- ACC-946224 -> step 2, 9,782.05, 7 Mar
- ACC-242954 -> step 3, 9,616.72, 8 Mar
- ACC-233575

Both routes go through 946224 first, then split: 670564 or 242954. Both have dates in order.

## Step 11 -- try to force time order

    timeout 120 node app-b/study.mjs --try D/11.png task:r8-t21-transactions --click "Quick actions" --type "path" --key Enter --type "ACC-271813" --key Enter --type "ACC-233575" --key Enter --click "amount (set at load)" --click "None (fewest steps)" --click "Follow time order" --click "Find path"

Wanted to tick "Follow time order" to confirm the answer doesn't change. The checkbox didn't take
the click; same result came back. Doesn't matter much -- both routes already say "Dates in order:
Yes" -- but I'd have liked to see that the constraint changes nothing.

## Answer

Fewest hops is 3 transfers, 2 accounts in between. Two routes tie:

1. ACC-271813 -> ACC-946224 -> ACC-670564 -> ACC-233575 (4 Mar, 7 Mar, 9 Mar)
2. ACC-271813 -> ACC-946224 -> ACC-242954 -> ACC-233575 (4 Mar, 7 Mar, 8 Mar)

Every route goes through ACC-946224 -- that's the choke point. Dates are in order on both, so
money could have moved that way inside the month. Caveat I'd put in the case: the amounts don't
match hop to hop (3.5k in, 9.4k-9.7k out), so these are possible routes, not traced funds.

## Wrap-up

- Succeeded? Yes, I think so. I trust "2 routes tie" only as far as I trust the tool; I'd want to
  re-run it in my notebook before it goes to anyone.
- Single Ease Question: 5 of 7. The palette and the hop table were quick. Lost points for the
  search box saying the account doesn't exist, the weight defaulting to amount when the question
  was fewest accounts, and a path I can't see on the graph.
- Would I use it instead of my current tool? For this kind of pivot, maybe -- the ordered hop table
  with "dates in order" is better than what I get from a shortest-path in BloodHound or a pandas
  self-join. But I didn't see a way to get the route rows out as CSV, I didn't see a query I could
  save and re-run on April's data, and "Local only" is a settings button, not a statement. Until
  those three are answered it stays a demo, not a tool.
