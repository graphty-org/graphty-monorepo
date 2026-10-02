# Session: transactions task, played by the SOC threat hunter (Priya)

Task as given by the moderator: "An alert names account ACC-633005. Bring it up, see what is known
about it, and pick out the accounts that sent money to it -- not the ones it paid. The data on
screen is a sample: one month of card and bank transfers between accounts."

All commands were run from `design/ui/prototype`. Renders are in
`tmp/round-7-sessions/t04-transactions--cybersecurity-analyst/`. Each `--try` run replays from
the start screen.

## 01 -- start screen (shots/tasks/t04-transactions/01.png)

"OK. 'Transfers, March 2026', 'Local only' in the top bar -- good, that's the first thing I'd
ask, it says it runs locally. I can't check it, but it says it. A gray hexagon blob, 3,000 nodes,
9,113 edges, directed. Fine, I don't care about the picture. I have an account ID. Search box top
left: 'Find rows and notes'. That's where I'm going."

## 02 -- type the ID into the search box

    timeout 120 node app-b/study.mjs --try $D/02.png task:t04-transactions --click "Find rows and notes" --type "ACC-633005"

(The box got focus but nothing was typed; the tool has no --type. Retried with key presses.)

## 03 -- typing works with keys

    timeout 120 node app-b/study.mjs --try $D/03.png task:t04-transactions --click "Find rows and notes" --key A --key C --key C

"Typing works. Finish the ID."

## 04 / 05 -- full ID, then Enter

    timeout 120 node app-b/study.mjs --try $D/04.png task:t04-transactions --click "Find rows and notes" --key A --key C --key C --key - --key 6 --key 3 --key 3 --key 0 --key 0 --key 5
    timeout 120 node app-b/study.mjs --try $D/05.png task:t04-transactions --click "Find rows and notes" (same keys) --key Enter

04: nothing happens as I type. 05: "No match for 'ACC-633005'."

"No match. The alert names this account and the tool says it doesn't exist. That's my
ground-truth check failing in the first thirty seconds. Either the account isn't in this file or
this box doesn't search accounts. 'Find rows and notes' -- rows of what? If 'rows' means those
three things underneath it, Selection, Notes, Everything, then this isn't a search, it's a filter
on a menu. Nothing tells me that."

## 06 -- slash shortcut

    timeout 120 node app-b/study.mjs --try $D/06.png task:t04-transactions --key /

"'/' does nothing visible. In Splunk and half my tools '/' jumps to search."

## 07 -- open the Table at the bottom

    timeout 120 node app-b/study.mjs --try $D/07.png task:t04-transactions --click "Table"

"OK, a table. This I understand. Nodes: id, Links in, Links out, Links total, kind, country.
Sorted by links total. And -- odd -- it opened on 'Rows 381 to 420 of 3,000', and the top row is
ACC-633005. Did it jump there because of the alert? Lucky? I can't tell. Anyway: ACC-633005,
business, GB. Links in (count, full graph): 0. Links out: 15.

Zero in. So according to this, nobody sent money to this account in this month. It only paid out
to 15. That's either the answer -- 'nobody' -- or the counts are wrong, or the direction is
flipped. If an alert fired on money coming in, a zero here is exactly the kind of number I
don't put in a case until I've seen the rows behind it."

## 08 -- click the row

    timeout 120 node app-b/study.mjs --try $D/08.png task:t04-transactions --click "Table" --click "ACC-633005"

"Row highlights, a dark tag 'Selects ACC-633005' floats over the toolbar. But the right panel
still shows the whole-graph summary. Nothing on the canvas lights up. So what did I select? I
want the account's details -- the alert columns, the risk score, whatever 'what is known' means."

## 09 -- check the Selection row on the left

    timeout 120 node app-b/study.mjs --try $D/09.png task:t04-transactions --click "Table" --click "ACC-633005" --click "Selection"

"Selection: 'Paints 0 nodes.' Color, size, opacity. So clicking the row either didn't select
it, or clicking 'Selection' threw it away. And it's a styling panel, not an account record. I
wanted facts about the account and got a color picker."

## 10 -- row plus Enter

    timeout 120 node app-b/study.mjs --try $D/10.png task:t04-transactions --click "Table" --click "ACC-633005" --key Enter

"Row gets a focus ring. Still no account detail anywhere."

## 11 -- Edges table

    timeout 120 node app-b/study.mjs --try $D/11.png task:t04-transactions --click "Table" --click "ACC-633005" --click "Edges"

"Now this is what I actually want. from_account, to_account, timestamp, amount. 9,113 edges,
sum of amount 14,156,522 -- in what currency? No unit. If I can filter to_account =
ACC-633005, the from_account column IS my answer. Where's the filter?"

## 12 -- click the to_account header

    timeout 120 node app-b/study.mjs --try $D/12.png task:t04-transactions --click "Table" --click "Edges" --click "to_account"

"It sorted. Ascending, by string. There's a little chevron on the header but I can't tell it's a
filter, and paging through 9,113 rows sorted by text to find 633005 is me doing grep by hand.
Give me a box where I type to_account = ACC-633005."

## 13 -- Ctrl+F

    timeout 120 node app-b/study.mjs --try $D/13.png task:t04-transactions --key Control+f

"Nothing."

## 14 -- the 'Full graph' button in the top bar

    timeout 120 node app-b/study.mjs --try $D/14.png task:t04-transactions --click "Full graph"

"I clicked it to see what scope I'm in. It switched the left side to a Data panel and the top
bar now says '812 of 3,000 nodes'. There's a filter 'amount is at least 1,000', checked. Did I
just turn that on? I didn't ask for a filter. And the picture didn't change at all -- still the
same blob. This is exactly the 'which time range is this' problem: I'm no longer sure what my
numbers cover.

Useful thing, though: the accounts file has alertRule, alertTime, flagged, riskScore. So 'what is
known' about my account exists in the data. I just can't get to it for one account."

## 15 -- double click the row

    timeout 120 node app-b/study.mjs --try $D/15.png task:t04-transactions --click "Table" --click "ACC-633005" --click "ACC-633005"

"Same as before. No detail."

## 16 -- Analyze

    timeout 120 node app-b/study.mjs --try $D/16.png task:t04-transactions --click "Table" --click "ACC-633005" --click "Analyze"

"A command palette. 'Search, or say what to find.' Louvain, PageRank, Shortest path, Links in
(count)... 'Total amount in'. That's an algorithm list. I'm not trying to rank anything, I'm
trying to pivot from one account to who paid it."

## 17 -- type the ID into Analyze

    timeout 120 node app-b/study.mjs --try $D/17.png task:t04-transactions --click "Analyze" --click "Search, or say what to find" (ID keys)

"(The box already had focus.) 'No match for ACC-633005.' Two search boxes now, neither knows my
account exists."

## 18 -- search Analyze for 'neigh'

    timeout 120 node app-b/study.mjs --try $D/18.png task:t04-transactions --click "Analyze" --key n --key e --key i --key g --key h

"'Neighborhood -- which nodes are one, two or more steps from the selection.' That's a pivot.
Needs a selection. I'll select the row first."

## 19 -- select row, then Neighborhood

    timeout 120 node app-b/study.mjs --try $D/19.png task:t04-transactions --click "Table" --click "ACC-633005" --click "Analyze" --key n --key e --key i --key g --key h --click "Neighborhood"

"...What. The title says 'Les Miserables'. Co-appearances. Valjean, Fantine, Javert. A dialog
says 'Neighborhood of Valjean, Direction: Undirected graph, Selected: Valjean and his 36
neighbors.' My transfers file is gone and I'm looking at characters from a novel.

That's my 'it went white' moment. I didn't open anything. If a tool swaps the dataset out from
under me during a pivot, I can't trust any number it showed me before that either. In a real
trial this is where I close the tab."

## 20 -- one more look, from the Data side

    timeout 120 node app-b/study.mjs --try $D/20.png task:t04-transactions --click "Table" --click "ACC-633005" --click "Data"

"Back on transfers (fresh start). Opening the Data panel and the top bar again says '812 of
3,000 nodes', and the table caption now says '3,000 nodes (before the filter)'. So opening the
panel seems to switch that amount filter on. The table still shows ACC-633005 with 0 in, 15 out,
which are 'full graph' counts. I'm stopping."

## Outcome

**Did I succeed?** No. What I have: the Nodes table says ACC-633005 (business, GB) has 0 links in
and 15 links out over the full month. Read literally, the answer is "no account sent money to
it; it only paid 15 others." But I never got the account itself up, never saw its alert fields
(alertRule, alertTime, riskScore exist as columns but I couldn't view them for this account),
and never saw the transfer rows behind that zero. I would not put "nobody paid it" in a case on
a count I can't drill into. And the one pivot that looked right replaced my data with a novel.

**Single Ease Question:** 2 out of 7. The table is the only reason it isn't a 1.

**Would I use this instead of my current tool?** No. In Splunk this is one line:
`to_account="ACC-633005" | stats sum(amount) by from_account`. Here:
- both search boxes said my account doesn't exist, while it was sitting in the table;
- clicking an account row does not open the account -- I never found where "what is known about
  it" lives for one node;
- the Edges table has exactly the columns I need but no visible way to filter one column to one
  value;
- a button I clicked to read the scope changed the scope (a filter on amount appeared), and the
  picture didn't change, so I couldn't tell what my counts covered;
- the Neighborhood pivot loaded a different dataset entirely.

What I did like, concretely: "Local only" in the top bar answers my first question before I ask
it, and the Edges table with from, to, timestamp, amount and a running sum is the right shape for
this job. If that table had a filter box per column and a CSV export, I'd have been done in a
minute without touching the graph at all.
