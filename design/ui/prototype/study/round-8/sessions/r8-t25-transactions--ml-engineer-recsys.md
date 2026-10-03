# Session: transfers weighted by how often two accounts trade -- Chris (ML engineer, recommendations)

Task as given: "The accounts and transfers spreadsheets are open on the import page (example data if
you do not work in banking). In every analysis from now on, two accounts that trade often should
count as more tightly tied than two that traded once. Set that up before you load, then check it
took."

All commands run from design/ui/prototype. D = tmp/round-8-sessions/r8-t25-transactions--ml-engineer-recsys

## 01 -- start screen (shots/tasks/r8-t25-transactions/01.png)

Import page for transfers-2026-03.csv. Header line says `account (3,000) --transfers (9,113)-->
account (3,000)`. amount is already tagged Weight, "Higher means Stronger". One edge per: Row | Pair.

Thinking aloud: "OK, so right now the weight is amount -- that's dollar volume, not frequency. Ten
one-dollar transfers would lose to one big wire. The task says *often*, so I want a count of rows
per pair, like a groupby(src, dst).size(). 'One edge per Pair' is the groupby. The report already
says 'No two transfers share both ends, so One edge per Pair would change nothing' -- which is the
first thing I'd want to know, and also a bit of a red flag: in this data nobody traded twice in the
same direction? Then frequency is going to be 1 almost everywhere. Whatever, let's see what Pair
gives me."

## 02 -- click Pair

    timeout 120 node app-b/study.mjs --try $D/02.png task:r8-t25-transactions --click "Pair"

Pair adds derived columns: `timestamp (latest)` and `count`, both marked derived. amount gets
"Combine: Sum", still the Weight. Toast: "amount stays the Weight, summed."

"Good -- a count column appears, that's the frequency. But it kept amount as the weight, summed.
Summed amount is volume, not frequency. I need count to be the weight. count is labeled
'Attribute', that's probably the role picker. Also: A->B and B->A are both 'trading' between two
accounts. If it's directed those stay separate pairs. Should be undirected for 'tied'."

## 03 -- Pair + Undirected

    timeout 120 node app-b/study.mjs --try $D/03.png task:r8-t25-transactions --click "Pair" --click "Undirected"

Report adds: "Undirected: (a, b) and (b, a) now merge: 9,113 edges become 9,087." Nice, a
number. But the header line right above still reads "9,113 edges from 9,113 rows" and the last line
of the report still says "9,113 rows became 9,113 edges". Three numbers, two answers.

"So 26 pairs traded in both directions. That's the only place count goes above 1. Fine, that's the
data. But which is it, 9,113 or 9,087? The bold summary line at the bottom says 9,113. I'm going to
trust the sentence that names the merge, but I'm annoyed."

## 04 -- open the count role menu

    timeout 120 node app-b/study.mjs --try $D/04.png task:r8-t25-transactions --click "Pair" --click "Attribute"

Menu: From/To grayed with a reason ("count is derived from the pair"), then Subtype, Name, Time,
Weight, Edge id, Position, Attribute (checked).

"Clear enough. Weight."

## 05 -- Pair + Undirected + count as Weight

    timeout 120 node app-b/study.mjs --try $D/05.png task:r8-t25-transactions --click "Pair" --click "Undirected" --click "Attribute" --click "Weight"

Toast "Weight moved from amount to count". Toolbar now reads "Weight: count, the number of rows per
pair". count column shows Higher means Stronger (Stronger in bold). amount went back to Attribute,
Combine Sum -- so I keep the volume as a column, good.

"That's exactly what I wanted, and it told me it moved the weight instead of silently having two.
Preview column still shows 1 in every visible row, which is honest given the data. Stronger is
already the default but I'll click it anyway to be sure."

## 06 -- click Stronger, Load

    timeout 120 node app-b/study.mjs --try $D/06.png task:r8-t25-transactions --click "Pair" --click "Undirected" --click "Attribute" --click "Weight" --click "Stronger" --click "Load"

Graph view, hex-binned blob (at least not a hairball), right panel Summary: Nodes 3,000; Edges
"9,087 transfers, each a distinct pair"; Direction Undirected; Weight "count, stronger" (a link);
Density 0.00101; Components 1; Avg degree 6.08; Highest degree 907; a log-log degree CCDF.

"That's the check: Weight = count, stronger, undirected, 9,087 edges. That's what I'd want in a
df.info(). Degree distribution on log-log with the range stated -- someone here has met a data
person. Let me click the weight link and see what it points at."

## 07 -- click "count, stronger"

    timeout 120 node app-b/study.mjs --try $D/07.png task:r8-t25-transactions --click "Pair" --click "Undirected" --click "Attribute" --click "Weight" --click "Stronger" --click "Load" --click "count, stronger"

Opens "Edit: transfers" -- and it shows One edge per **Row**, **Directed**, Weight **amount**,
"9,113 rows became 9,113 edges", Apply disabled ("Nothing has changed yet").

"What. That's the original setup, not what I loaded. So either the summary is lying or the editor
is. If I hit Apply here does it re-import with amount? This is the 'check it took' step and it just
told me it didn't."

## 08 -- back to the graph, open the edges table

    timeout 120 node app-b/study.mjs --try $D/08.png task:r8-t25-transactions --click "Pair" --click "Undirected" --click "Attribute" --click "Weight" --click "Stronger" --click "Load" --click "Edges"

Edges table: "9,113 edges", rows 1 to 6 of 9,113, columns from_account, to_account, timestamp,
amount. No count column. No timestamp earliest/latest.

"Second contradiction. Summary: 9,087 undirected edges weighted by count. Table: 9,113 edges, no
count column, the raw rows. If I can't see the weight column on the edge I can't check a single
edge's value, and I can't export it. In a notebook I'd assert len(edges) == 9087 and this would
fail. I'm stopping here."

## Verdict

- Did I succeed? Partly. I set it up the way I meant it (one edge per pair, undirected, weight =
  number of transfers, higher = stronger), and the graph summary says it took. But the two other
  places I looked -- the edit page behind the weight link and the edges table -- both show the
  original per-row, directed, amount-weighted setup. I don't know which one the algorithms will
  use. I would not trust a weighted centrality run off this.
- Single Ease Question: 4 / 7. Setting it up was easy (maybe 6); checking it was the hard and
  untrustworthy part.
- Would I use this instead of my current tool? Not for this. `df.groupby([min(a,b), max(a,b)]).size()`
  is one line and I can assert on it. What I liked and don't get in a notebook: the report that told
  me before loading that no pair repeats and that undirected merges 26 pairs, the role menu that
  explains why From/To are disabled, the toast saying the weight *moved* rather than leaving two
  weights, and the summary panel. What kills it: the edges table and the edit page disagree with the
  summary on the edge count and the weight. Denominators that don't match is the one thing I can't
  forgive.

## Other notes

- Header "Makes ..." line and the report's last bold line did not update to 9,087 after choosing
  Undirected, while a report line just above did.
- "Weight: amount" in the toolbar is plain text; the only way to change the weight column was to go
  to the count column's role menu. Found it fine, but only because count said "Attribute" where a
  role normally sits.
- With this data, frequency weighting barely does anything (count is 1 on all but 26 pairs). The
  app showed that truthfully; nothing warned me that the weight I chose is almost constant, which is
  the thing I'd actually want flagged ("count is 1 for 99.7% of edges").
