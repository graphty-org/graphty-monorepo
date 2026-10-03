# Session: transfers import, make frequent trading count as a tighter tie -- Sarah, fraud analyst

Task as given by the moderator: "The accounts and transfers spreadsheets are open on the import
page (example data if you do not work in banking). In every analysis from now on, two accounts
that trade often should count as more tightly tied than two that traded once. Set that up before
you load, then check it took."

Mode: not mandated. Patience: first-impression (about five minutes, one task).
Renders: design/ui/prototype/tmp/round-8-sessions/r8-t25-transactions--fraud-analyst/NN.png
All commands run from design/ui/prototype.

## Step 1 -- start screen (shots/tasks/r8-t25-transactions/01.png)

OK. Import page, transfers table. from_account, to_account, amount, timestamp. Fine, that's my
statement export. Across the top: "Each row is an edge", "One edge per Row / Pair", "Weight:
amount". Under amount it says Weight, "Higher means Stronger" already picked.

So right now the tie between two accounts is the dollar amount. That's not what I was asked.
I was asked for how OFTEN they trade. Ten transfers of fifty bucks should beat one transfer of
five hundred. In a pivot I'd do a count of rows by from/to pair. "One edge per Pair" sounds like
my pivot: collapse every from/to pair into one line. Try that.

Also, I read the report at the bottom: "No two transfers share both ends, so One edge per Pair
would change nothing." Hmm. So in this file every pair traded exactly once? 9,113 transfers and
not one repeat pair in a month? On real data that would never happen -- payroll alone repeats.
Noted. Carry on.

## Step 2 -- One edge per Pair

    timeout 120 node app-b/study.mjs --try .../02.png task:r8-t25-transactions --click "Pair"

Good. Banner: "One row per pair: each is one edge, its count the rows it merged." Now there's a
"count" column, marked derived, and timestamp became earliest and latest. That's exactly a pivot.
The toast says "amount stays the Weight, summed." So the tie is now total dollars per pair. Still
not frequency. The count column is sitting there labelled "Attribute". I want count to be the
weight.

## Step 3 -- the count column's role

    timeout 120 node app-b/study.mjs --try .../03.png task:r8-t25-transactions --click "Pair" --click "Attribute"

Dropdown. Some grayed text at top about From/To being derived, whatever. Then Subtype, Name,
Time, Weight, Edge id, Position, Attribute (checked). Weight.

## Step 4 -- make count the Weight

    timeout 120 node app-b/study.mjs --try .../04.png task:r8-t25-transactions --click "Pair" --click "Attribute" --click "Weight"

Toast: "Weight moved from amount to count." Top bar now reads "Weight: count, the number of rows
per pair". Under count: Higher means Stronger. That's the right way round -- more transfers,
tighter tie. Good, that's the setup. Took me three clicks and I had to know to merge pairs first;
if I hadn't clicked Pair there's no count column to pick. Nothing on the first screen says "weight
by how often". I got there because I think in pivots.

And amount went back to plain attribute, combine Sum. Fine, I still have the money.

## Step 5 -- should it be both directions?

    timeout 120 node app-b/study.mjs --try .../05.png task:r8-t25-transactions --click "Pair" --click "Attribute" --click "Weight" --click "Undirected"

"Two accounts that trade often" -- trading is both ways. If A pays B five times and B pays A five
times, that's ten, not two separate fives. So I tried Undirected.

The report says "Undirected: (a, b) and (b, a) now merge: 9,113 edges become 9,087." Two lines
below it: "9,113 rows became 9,113 edges." And the header at the top still says "9,113 edges from
9,113 rows". So which is it, 9,087 or 9,113? Three numbers on one screen and they don't agree. If
my reviewer saw that she'd send the case back.

And undirected throws away who paid whom. I can't lose that -- flow of funds is the whole case. I
went back to Directed. A to B and B to A stay separate ties. Not what the task strictly says, but
I'm not trading direction for it.

## Step 6 -- Load, directed, count as weight

    timeout 120 node app-b/study.mjs --try .../06.png task:r8-t25-transactions --click "Pair" --click "Attribute" --click "Weight" --click "Load"

Picture is a gray hairball, as expected. Right side, Summary: Edges "9,113 transfers, each a
distinct pair". Direction: Directed. Weight: "count, stronger". OK -- that's the check. It says
count, it says stronger. That reads like it took.

"Each a distinct pair" though. So every count is 1. The setting is right and on this file it
changes nothing at all -- every tie weighs the same. Fine for a demo; I'd want to see it on a
real month.

## Step 7 -- click "count, stronger" to confirm

    timeout 120 node app-b/study.mjs --try .../07.png task:r8-t25-transactions --click "Pair" --click "Attribute" --click "Weight" --click "Load" --click "count, stronger"

Now I'm worried. It opened "Edit: transfers" and it shows One edge per **Row**, "Weight: amount",
amount marked Weight, no count column, timestamp single again. That's the original setup, not
what I loaded. The summary said count; the edit page says amount. Which one is the truth? If I
press Apply here do I undo my weight? I didn't touch anything. "Apply is off: Nothing has
changed yet."

That's exactly the thing that kills trust. I clicked the link to check, and the check says the
opposite of the summary.

## Step 8 -- look at the edges table

    timeout 120 node app-b/study.mjs --try .../08.png task:r8-t25-transactions --click "Pair" --click "Attribute" --click "Weight" --click "Load" --click "Edges"

Edges table: from_account, to_account, timestamp, amount. 4 of 4 columns. No count column. No
earliest/latest either. So where's the count the weight is supposedly using? I can't see the
number I'm told is driving everything. I can't trace it to rows.

## Step 9 -- Analyze, to see what "every analysis" will use

    timeout 120 node app-b/study.mjs --try .../09.png task:r8-t25-transactions --click "Pair" --click "Attribute" --click "Weight" --click "Load" --click "Analyze"

List of things: Louvain, PageRank (developer words, skipping), Shortest path ("the fewest steps,
or the lightest route"), Links total (count), Total amount in and out... Nothing here tells me
which weight Shortest path or the groups thing will use. "Lightest route" -- lightest by what? If
count means stronger, is a frequent pair "light" or "heavy"? I'd guess heavy, which means the
shortest path would avoid the accounts that trade most. That's backwards for me. Don't know. I
stopped here.

## Outcome

Did I succeed? Probably. The summary panel says "Weight: count, stronger" and that's what I set.
But the edit page I opened from that same link shows the old setup (Row, weight amount), and the
edges table has no count column. So I can't prove it took, and on this file every pair is 1
anyway, so even if it took nothing changed. I'd tell my manager "I think it's set, I couldn't
verify it."

Also not answered: "every analysis from now on." Is this the setting for this graph only, or for
the next month's file too? Nothing said.

Single Ease Question: 4 of 7. Finding the setting was OK once I thought "pivot by pair". Checking
it was the hard part, and it contradicted itself.

Would I use this instead of my current tool? Not for this. In Excel I'd count rows by pair in a
pivot and I'd see the counts. Here the count exists somewhere I can't see, and two screens
disagree about whether it's even the weight. The "nothing is uploaded" line and the match report
are good -- better than i2's import wizard, which never tells me how many rows matched. But a
setting I can't verify isn't one I'd put in a SAR.

## Problems noticed

- To weight by how often two accounts trade, you must first switch to One edge per Pair; nothing
  on the default screen suggests frequency as a weight. (moderate)
- Undirected report says "9,113 edges become 9,087" while the last line and the header still say
  9,113 edges. (high -- numbers disagree on one screen)
- Clicking "count, stronger" in the loaded graph's summary opens the edit page showing Row and
  Weight: amount -- the opposite of what the summary says was loaded. (severe -- the check fails)
- Edges table after load has no count column, so the weight cannot be traced to rows. (high)
- Analyze entries do not say which weight they use or which way; "lightest route" is ambiguous
  when higher weight means stronger. (moderate)
- No indication whether the setting applies only to this graph or to future imports, despite
  "from now on". (moderate)
- Example data has no repeated pairs, so the setting is invisible in its effect. (low; a demo-data
  issue, but I'd raise it)

## Good

- Match report: "9,113 of 9,113 from_account found in accounts", "nothing is uploaded". Clear.
- One edge per Pair with a derived count and earliest/latest timestamp is literally my pivot.
- Toasts say in words what changed ("Weight moved from amount to count") with Undo.
- "Higher means Stronger / Farther / Capacity" is a plain question I could answer.
