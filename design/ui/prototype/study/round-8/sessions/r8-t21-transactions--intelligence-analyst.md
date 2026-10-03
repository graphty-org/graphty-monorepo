# Session: money path between two accounts -- Marcus, criminal intelligence analyst

Task as given by the moderator: "A month of card transfers between accounts is open, and the
program has already sorted the accounts into groups. If you do not work in banking, this is
example data, not your own. Work out how money could have gone from account ACC-271813 to account
ACC-233575 through the smallest number of other accounts: say which accounts are in between,
whether there is more than one such way, and whether the dates allow it."

All commands were run from design/ui/prototype. Renders are in
tmp/round-8-sessions/r8-t21-transactions--intelligence-analyst/ (shortened below to `$D`).

## Start screen (shots/tasks/r8-t21-transactions/01.png)

Marcus: "Okay. Transfers, March 2026. Three thousand-some dots in a ball, colored by something
called Louvain. That's the hairball. I'm not reading anything off that. Right panel's all about
'communities' and 'modularity 0.688' -- not my question. My question is A to B. First thing,
find the account. There's a search box top left, 'Find rows and notes'. Try that."

## Step 1 -- search for the first account

```
timeout 120 node app-b/study.mjs --try $D/01.png task:r8-t21-transactions --hover "Find rows and notes"
timeout 120 node app-b/study.mjs --try $D/02.png task:r8-t21-transactions --hover ""
timeout 120 node app-b/study.mjs --try $D/03.png task:r8-t21-transactions --click "Find rows and notes" --type "ACC-271813"
```

(01 and 02 were pointer rests with nothing useful; 02 was a slip of the hand.)

03: "No match for 'ACC-271813'." -- "No match? It's in the task. The account is in this file.
So what does 'rows' mean in that box -- it's searching the list on the left, the layers, not
the accounts? That's a search box that doesn't search my data. Strike one."

## Step 2 -- open the table

```
timeout 120 node app-b/study.mjs --try $D/04.png task:r8-t21-transactions --click "Table"
```

04: A table of accounts slides up: 3,000 nodes, sorted by total amount in, from
accounts-2026-03.csv. "Fine, that's a spreadsheet, I know a spreadsheet. ACC-393859 took in 907
transfers -- that's interesting, but not today. I don't see a filter on the id column. I'm not
paging through 3,000 rows. Is there a way to just ask for a path?"

## Step 3 -- find a path tool

Rested the pointer on the bottom toolbar icons, guessing names.

```
for n in "Analyze" "Algorithms" "Run" "Path"; do timeout 120 node app-b/study.mjs --try $D/scratch-hover.png task:r8-t21-transactions --hover "$n"; done
```

The flask icon says "Analyze Shift+A". Nothing called Algorithms or Path.

```
timeout 120 node app-b/study.mjs --try $D/05.png task:r8-t21-transactions --click "Analyze"
```

05: An Analyze list. Under Recent: Louvain, PageRank, "Shortest path -- The fewest steps, or the
lightest route, between two nodes." -- "There it is. That's the one investigators ask me for.
Good that it's near the top. Wish it had been on the screen to start with instead of a flask."

## Step 4 -- fill in the path

```
timeout 120 node app-b/study.mjs --try $D/06.png task:r8-t21-transactions --click "Analyze" --click "Shortest path"
```

06: "Path between" box: From, To, Direction (Follow edges / Either way), a "Follow time order"
checkbox, Weight "amount (set at load)" with Stronger / Farther / Capacity and a note that it
uses 1/amount, Scope whole graph, 3,000 accounts. Find path is grayed.

"Weight by amount? I don't want the 'strongest' path, I want the fewest hops -- the task says the
smallest number of accounts in between. Default's wrong for my question. Also 'Follow edges' --
does that mean follow the direction money went? I'll assume yes. And 'Follow time order' -- that's
the date question, good that it's there."

```
timeout 120 node app-b/study.mjs --try $D/07.png task:r8-t21-transactions --click "Analyze" --click "Shortest path" --click "Type a name" --type "ACC-271813"
timeout 120 node app-b/study.mjs --try $D/08.png task:r8-t21-transactions --click "Analyze" --click "Shortest path" --click "Type a name" --type "ACC-271813" --click "Click to pick" --type "ACC-233575" --click "amount (set at load)"
```

07: Typed the account, no list of matches dropped down, nothing told me it found it.
08: I moved to To and typed the second one -- and From is blank again, back to "Click to pick".
"Where did my first account go? I typed it, it's gone. No warning. That's how you lose a morning.
Strike two." The weight dropdown does have "None (fewest steps)" -- that's the one I want.

```
timeout 120 node app-b/study.mjs --try $D/09.png task:r8-t21-transactions --click "Analyze" --click "Shortest path" --click "Type a name" --type "ACC-271813" --key Enter
timeout 120 node app-b/study.mjs --try $D/10.png task:r8-t21-transactions --click "Analyze" --click "Shortest path" --click "Type a name" --type "ACC-271813" --key Enter --type "ACC-233575" --key Enter --click "amount (set at load)" --click "None (fewest steps)"
```

09/10: "So you have to hit Enter for it to take. Fine, now I know. Both in, weight None (fewest
steps), Find path is blue." Odd: From has a bank-building icon and To has a little person icon.
"Are those different kinds of things? They're both accounts."

## Step 5 -- run it

```
timeout 120 node app-b/study.mjs --try $D/11.png task:r8-t21-transactions --click "Analyze" --click "Shortest path" --click "Type a name" --type "ACC-271813" --key Enter --type "ACC-233575" --key Enter --click "amount (set at load)" --click "None (fewest steps)" --click "Find path"
```

11: Bar at the bottom: "3 steps. 2 routes tie. Dates in order. Route 1 of 2." Right panel:
4 accounts, 3 transfers. From ACC-271813, business, riskScore 1. To ACC-233575, personal,
riskScore 98, flagged. Then the route, step by step:

- ACC-271813 sends 3,530.28 on 4 Mar to ACC-946224
- ACC-946224 sends 9,468.23 on 7 Mar to ACC-670564
- ACC-670564 sends 9,399.31 on 9 Mar to ACC-233575
- "This trace: 3 transfers, 4 Mar to 9 Mar, dates in order"

"Now that's what I wanted. That's an answer I can read out to a case agent: who, how much, what
day, and a Yes on each line that the dates run forward. That table is better than the picture."

"But -- the canvas. I can't see the path anywhere. The path is colored orange, and Community 5 in
the Louvain legend is also orange. Three accounts in a ball of three thousand. I'd never show
this chart to anybody."

"And the money doesn't add up the way a layman would assume: 3,530 goes into ACC-946224 and 9,468
comes out. So it 'could have' gone that way, but at most 3,530 of it is the same money. I'd say
that to the prosecutor before the defense does."

"riskScore 98, flagged. Ninety-eight of what? Flagged by whom? I'm not repeating that number."

## Step 6 -- the second route

```
timeout 120 node app-b/study.mjs --try $D/12.png task:r8-t21-transactions --click "Analyze" --click "Shortest path" --click "Type a name" --type "ACC-271813" --key Enter --type "ACC-233575" --key Enter --click "amount (set at load)" --click "None (fewest steps)" --click "Find path" --hover "Next route"
timeout 120 node app-b/study.mjs --try $D/13.png task:r8-t21-transactions --click "Analyze" --click "Shortest path" --click "Type a name" --type "ACC-271813" --key Enter --type "ACC-233575" --key Enter --click "amount (set at load)" --click "None (fewest steps)" --click "Find path" --click "Next route"
```

13: Route 2 of 2:

- ACC-271813 sends 3,530.28 on 4 Mar to ACC-946224
- ACC-946224 sends 9,782.05 on 7 Mar to ACC-242954
- ACC-242954 sends 9,616.72 on 8 Mar to ACC-233575
- dates in order, 4 Mar to 8 Mar

"So both go through ACC-946224 first. That's the choke point -- every shortest way goes through
it. Then it splits: through ACC-670564 or through ACC-242954. Same day out of 946224, 7 March,
both. That's the account I'd want the subpoena on. The tool didn't say 'both routes share
946224' -- I worked that out flipping back and forth. Would be nice if it said so."

"Also: it says two routes tie. Are those the only two? I'll take its word, but I'd want a list,
not a pager."

## Step 7 -- does 'Follow time order' change anything?

```
timeout 120 node app-b/study.mjs --try $D/14.png task:r8-t21-transactions --click "Analyze" --click "Shortest path" --click "Type a name" --type "ACC-271813" --key Enter --type "ACC-233575" --key Enter --click "amount (set at load)" --click "None (fewest steps)" --click "Follow time order" --click "Find path"
```

The checkbox did not take the click ("could not click Follow time order"); the result came back
the same as before. "Checkbox won't tick. Whatever -- the results already say dates in order with
a Yes on each step, so the answer holds either way. But I'd like to know whether, unticked, it
would have handed me a route where the dates go backward and just flagged it. Can't tell."

## Step 8 -- try to see it on the chart

```
timeout 120 node app-b/study.mjs --try $D/15.png task:r8-t21-transactions --click "Analyze" --click "Shortest path" --click "Type a name" --type "ACC-271813" --key Enter --type "ACC-233575" --key Enter --click "amount (set at load)" --click "None (fewest steps)" --click "Find path" --click "4 accounts, 3 transfers"
```

15: Tooltip "Selects the path's accounts and transfers." The ball looks the same. "Selected them,
apparently. I still can't see four dots in that. I'd want a button that says 'show just these' --
the thirty people around this guy, not the whole database. I'm stopping here; I have my answer."

## Answer Marcus gives

- Fewest accounts in between: two. Three transfers.
- Two routes tie, both starting ACC-271813 -> ACC-946224 (3,530.28, 4 Mar):
  1. -> ACC-670564 (9,468.23, 7 Mar) -> ACC-233575 (9,399.31, 9 Mar)
  2. -> ACC-242954 (9,782.05, 7 Mar) -> ACC-233575 (9,616.72, 8 Mar)
- Dates allow it on both: each transfer is later than the one before it.
- Caveat he adds himself: ACC-946224 sends out far more than it received from ACC-271813, so at
  most about 3,530 of what reaches ACC-233575 can be the same money.

## Debrief

Succeeded? "Yes. I've got the in-between accounts, both routes, and the dates. I'd double-check
the transfers against the bank return before it goes in a report, but the tool gave me what I'd
need to pull."

Single Ease Question: 5 of 7. "Once I found the path box, the answer was good -- the step table
with dates and a Yes on each is exactly the right shape. Getting there cost me: the search box
that says no match for an account that's in the file, the From field that wiped itself when I
moved on without pressing Enter, and a default weight that answers a different question than
'fewest accounts'."

Would he use it instead of his current tool? "For this question -- A to B in a money file -- maybe,
yes, over doing it by hand in Excel, which is what I'd do today, and i2 would take me longer to
build the chart first. Not yet as my chart tool: I can't see the path on the picture, the path
color is the same as one of the groups, and I can't pull out just those four accounts as a clean
chart for the sergeant. And before any real case goes in, somebody tells me in writing where this
file lives. It says 'Local only' up top -- I noticed that, and I'd want IT to confirm it."

## Problems seen, in order of how much they hurt

1. The account search ("Find rows and notes") reports "No match" for an account that is in the
   data -- it does not search accounts. First action failed.
2. The From box lost a typed account when focus moved to To without Enter; no warning.
3. The finished path is invisible on the canvas: three-thousand-node ball, and the path color
   matches Community 5 in the Louvain coloring underneath. Selecting it changes nothing visible.
4. Default weight is "amount" (strongest route), not fewest steps; the task's question needs a
   dropdown change the reader has to know to make.
5. Nothing says the two tied routes share ACC-946224; the reader works it out by paging.
6. "Follow time order" checkbox could not be clicked; unclear what unticked means for dates.
7. "riskScore 98, flagged" shown with no source or meaning.
8. From and To show different icons (building vs person) for two accounts.
9. Typed names give no match list or confirmation before Enter.
