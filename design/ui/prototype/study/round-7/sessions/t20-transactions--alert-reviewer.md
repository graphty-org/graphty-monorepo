# Session: weight transfers by how often two accounts trade -- Nadia, level-1 alert reviewer

Task as given by the moderator: "Two accounts that trade with each other often should be treated
as more tightly tied than two that traded only once, whatever the sums -- and graphty should use
that in every later analysis. Set that up as the transfers come in. The data on screen is a
sample: one month of card and bank transfers between accounts."

Renders are in design/ui/prototype/tmp/round-7-sessions/t20-transactions--alert-reviewer/.
All commands ran from design/ui/prototype. P below stands for
/home/apowers/Projects/graphty-monorepo/.worktrees/ux-storyboards-mocks-and-study/design/ui/prototype.

## Start screen (shots/tasks/t20-transactions/01.png)

Think-aloud: "OK, this is an import screen. Two tables, accounts and transfers. The transfers
columns are from, to, amount, timestamp. amount has a blue tag saying Weight, Higher means
Stronger. So right now it thinks a big transfer is a tight tie. That is the opposite of what I
was told -- they want the number of times, not the sum. Up top there is 'One edge per Row / Pair'.
If I pick Pair it should squash all the transfers between two accounts into one line, and then
there should be a count somewhere. Let me try that."

## Step 1 -- One edge per Pair

    timeout 120 node app-b/study.mjs --try P/tmp/round-7-sessions/t20-transactions--alert-reviewer/01.png task:t20-transactions --click "Pair"

Saw: banner "One row per pair: each is one edge, its count the rows it merged." Two new gray
columns, "timestamp (latest)" and "count", both marked derived. count says "Attribute". amount
still says Weight, now with "Combine Sum".

Think-aloud: "Good, there is the count. It is 1 everywhere in the first six rows. The report says
no two transfers share both ends in this sample, so Pair changes nothing today -- fine, it's a
sample, the real feed will have repeats. Now I need count to be the weight, not amount. count
says Attribute in gray -- I'll click that."

## Step 2 -- open the count column's role

    timeout 120 node app-b/study.mjs --try P/.../02.png task:t20-transactions --click "Pair" --click "Attribute"

Saw: a dark menu: From, To (both grayed with "count is derived from the pair"), Subtype, Name,
Time, Weight, Edge id, Position, Attribute (checked).

Think-aloud: "Weight. Obviously."

## Step 3 -- make count the weight

    timeout 120 node app-b/study.mjs --try P/.../03.png task:t20-transactions --click "Pair" --click "Attribute" --click "Weight"

Saw: count now has the blue Weight tag, Higher means Stronger. amount dropped back to Attribute.
A toast: "Weight moved from amount to count -- Undo". The count column moved to the far right.

Think-aloud: "Nice, it told me it moved it instead of making me unset amount first. More
transfers, stronger tie. That's the ask. One thing nags me: 'trade with each other'. A pays B and
B pays A -- is that one pair or two? Right now it's Directed, so two. Let me see what Undirected
does."

## Step 4 -- peek at Undirected

    timeout 120 node app-b/study.mjs --try P/.../04.png task:t20-transactions --click "Pair" --click "Attribute" --click "Weight" --click "Undirected"

Saw: report line "Undirected: (a, b) and (b, a) now merge: 9,113 edges become 9,087." But the line
under it still says "9,113 rows became 9,113 edges", and the header still says 9,113 edges.

Think-aloud: "Which is it, 9,087 or 9,113? Two numbers on the same screen that disagree -- QA
would bounce that. And anyway I'm not losing who paid whom; in my job direction is half the
story. I'm leaving it Directed. The moderator said 'trade with each other' but I'd rather keep
the direction and ask. Back to Directed and load."

## Step 5 -- Load (Directed, Pair, count as Weight)

    timeout 120 node app-b/study.mjs --try P/.../05.png task:t20-transactions --click "Pair" --click "Attribute" --click "Weight" --click "Load"

Saw: "Reading transfers-2026-03.csv, 3,000 nodes, 9,113 edges..." progress bar.

## Step 6 -- does later analysis use it?

    timeout 120 node app-b/study.mjs --try P/.../06.png task:t20-transactions --click "Pair" --click "Attribute" --click "Weight" --click "Load" --click "Analyze"

Saw: the graph, an Analyze list (Louvain, PageRank, Shortest path, Links count, Total amount...).
On the right, the Summary panel: Direction Directed, **Weight: amount, stronger**.

Think-aloud: "Wait. Weight amount? I set it to count. I watched the toast say it moved. Did it not
keep it, or does 'Load' throw away what I did? This is exactly the 'did I change the data or only
the view' thing I'm never sure of. Let me click that link and see."

## Step 7 -- click the Weight link before the load finished (failed)

    timeout 120 node app-b/study.mjs --try P/.../07.png ... --click "Load" --click "amount, stronger"

Result: "nothing on screen is called 'amount, stronger'" -- it was still loading. Retried after
letting it finish.

## Step 8 -- click "amount, stronger"

    timeout 120 node app-b/study.mjs --try P/.../08.png ... --click "Load" --click "Analyze" --key Escape --click "amount, stronger"

Saw: "Edit: transfers" -- the same import screen, but back to One edge per **Row**, amount as
Weight, no count column. Apply grayed: "Apply is off: Nothing has changed yet".

Think-aloud: "Everything I did is gone. Pair, count, all of it. OK, doing it again."

## Step 9 -- redo it in the edit screen

    timeout 120 node app-b/study.mjs --try P/.../09.png ... --click "amount, stronger" --click "Pair" --click "Attribute" --click "Weight"

Saw: same as step 3. Pair, count is Weight, toast "Weight moved from amount to count". Apply is
now blue.

## Step 10 -- Apply

    timeout 120 node app-b/study.mjs --try P/.../10.png ... --click "Weight" --click "Apply"

Saw: Data panel. transfers-2026-03.csv "9,113 rows, 9,113 edges". Attributes, transfers, In use
(1): **amount -- Weight**. No count anywhere. Summary on the right still "Weight: amount,
stronger".

Think-aloud: "Same thing again. It shows me the change, says it moved, I press the button, and
it's amount again. No count attribute listed at all."

## Step 11 -- click amount in the attribute list

    timeout 120 node app-b/study.mjs --try P/.../11.png ... --click "Apply" --click "amount"

Saw: amount details. Role: "Weight, set when loaded". Higher means: Stronger (chosen when loaded).
Values histogram, 9,113 transfers, 14,156,522.28 in all.

Think-aloud: "'Set when loaded.' So it is decided at load, which is what I tried to do, twice, and
it's still amount. There's no switch here to change it, and no count to switch to. I've spent
longer on this than on an alert. I'm done."

## Outcome

- Did I succeed? No. I found the right controls on the import screen -- Pair, then count as the
  Weight -- and the screen showed it. But after Load, and again after Edit and Apply, the graph
  says its weight is amount, and count is not even listed as an attribute. Every later analysis
  would be using the sums, which is the opposite of what was asked.
- Single Ease Question: 2 out of 7. Finding the setting was a 5 -- Pair and the count column made
  sense, and the "Weight moved from amount to count" toast was clear. Then it did not stick, twice,
  with no message saying why.
- Would I use this instead of my current tool? No. I don't have a graph tool; this would be
  instead of a spreadsheet plus the case system. A setting that shows as done and then isn't is
  worse than a spreadsheet, because QA asks "what weight did you use" and I couldn't say
  honestly. I would also want to know, before Load, whether the sample having no repeat pairs is
  why count got dropped -- if so, it should tell me, not quietly put amount back.

## Problems seen

1. After choosing Pair and count as Weight, Load (and later Edit + Apply) leaves the graph
   weighted by amount; the Summary says "Weight: amount, stronger" and the Edit screen reopens on
   Row with amount as Weight. No message explains it. (Severity: blocks the task.)
2. The undirected report says "9,113 edges become 9,087" while the line below and the header say
   9,113 edges. Two counts disagree on one screen.
3. "trade with each other" vs Directed: nothing on the screen helps me decide whether A-to-B and
   B-to-A should be counted together while keeping who paid whom.
4. The Weight link in the Summary is not clickable until the load finishes, with nothing telling
   me it is still loading in that panel.
