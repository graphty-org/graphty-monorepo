# Session: transfers of 1,000 or more -- Priya, threat hunter

Task given by the moderator: "A month of card transfers between accounts is open. If you do not
work in banking, this is example data, not your own. You want every count and every drawing from
now on to include only transfers of 1,000 or more. Set that up, then say how many accounts are
left."

Start screen: shots/tasks/r8-t20-transactions/01.png
Renders: tmp/round-8-sessions/r8-t20-transactions--cybersecurity-analyst/02.png to 11.png
All commands were run from design/ui/prototype. Each one replays from the start screen.

## Think-aloud

**01 (start).** "Transfers, March 2026". 3,000 nodes, 9,113 edges. "Local only" at the top is the
first thing I look for, and it's there; good. Next to it is a chip with a funnel that says "Full
graph". A funnel means a filter. I click it.

```
timeout 120 node app-b/study.mjs --try .../02.png task:r8-t20-transactions --click "Full graph"
```

**02.** It opened a Data panel. Sources, then Filters: "No filters. Filters change what is
computed; the eye in the Graph tree only hides." That's the distinction I care about. I don't want
a cosmetic hide, I want the counts to change. "Add filter step".

```
... --click "Full graph" --click "Add filter step"
```

**03.** A "New step" with "Keep: Pick one" and a menu: by an attribute or computed value, top of a
computed value, largest component, k-core, neighbors. Amount is an attribute, so "By an attribute
or computed value".

```
... --click "Full graph" --click "Add filter step" --click "By an attribute or computed value"
```

**04.** An attribute picker grouped by table: accounts, then transfers with amount and timestamp.
I click "amount".

```
... --click "By an attribute or computed value" --click "amount"
```

**05.** That threw me out of my filter and into the details for the amount column: type, role,
histogram. The left-hand Attributes list also has an "amount" row, and that is the one that took
the click, not the menu item. Annoying. I go back and aim at the one in the open menu.

```
... --click "By an attribute or computed value" --click "amount, in use: Weight, transfers"
```

**06.** Now: "amount" / "is at least" / empty box. "is at least" was already picked as the
default, which is what I wanted. The helper text says the step keeps the edges that pass and the
nodes at their ends. That's the right meaning for "transfers of 1,000 or more". The value box has
focus, so I type 1000 and press Enter.

```
... --click "amount, in use: Weight, transfers" --key 1 --key 0 --key 0 --key 0 --key Enter
```

**07.** "812 of 3,000 nodes" in the step, in the side panel, and in the top chip. It updated as
soon as I hit Enter. But the drawing is the same blob it was before. Did anything actually change
in the picture?

```
... --key Enter --click "Graph"
```

**08.** Back on the graph. The summary says nodes "812 of 3,000", but edges still say "9,113
transfers", and density, components and the degree numbers are the same as at the start. There's
a banner: "5 readings are for all 3,000 nodes -- Compute on 812". So the filter did NOT flow into
the counts by itself. I asked for every count. Fine, click it.

```
... --click "Graph" --click "Compute on 812"
```

**09.** Readings moved: density 0.00214, 4 weak components (was 1), average degree 3.47, highest
degree 211 (was 907), plus clustering, diameter and so on. But the Edges row STILL says "9,113
transfers". That contradicts the rest: 3.47 average total degree across 812 nodes works out to
about 1,400 edges, not 9,113. One row on this panel is wrong, and I can't tell which number to
trust. And the drawing still looks unchanged.

```
... --click "Compute on 812" --click "Edges"
```

**10.** The edge table says "9,113 edges (before the filter)", and the first rows have amounts of
5.04, 8.97, 44.6. So the table ignores the filter on purpose and says so. I'll give it credit for
saying so, but I asked for every count to use the filter, and the table is a count. The canvas got
shorter to make room for the table, but it's still the full hairball.

```
... --click "Edges" (replaced by) --click "812 of 3,000 nodes"
```

**11.** I opened the top chip to see if there was a switch for "apply everywhere". It took me back
to Data, and now there are TWO filter steps: mine, renamed "amount >= 1,000" with "1 note" on it
that I didn't write, and another one, "kind is not merchant", that I did not add. That one says it
kept all 812 nodes, so my answer doesn't change. But a filter appearing in my pipeline that I
didn't put there would end a real trial for me; I can't hand my lead a count when the tool adds
conditions on its own. This screen does say what I wanted to see: "This step: 1,204 of 9,113
edges, 812 of 3,000 nodes", with a Scope line saying the step runs on all 9,113 transfers.

Stopping here.

## Answer

812 accounts are left (connected by 1,204 transfers of 1,000 or more).

## Did I succeed?

Mostly. The filter is set up and the account count is 812. Whether "every count and every
drawing" now uses it, I can't confirm: the summary needed a manual "Compute on 812", its Edges row
kept saying 9,113 after that, the edge table deliberately shows the unfiltered rows, and the
drawing never visibly changed.

## Single Ease Question

4 of 7. Building the filter was quick and the vocabulary was right: "is at least" was already
picked, and the helper text explained edges versus nodes. Everything after that was me checking
whether it had actually worked, and the answers didn't agree.

## Would I use this instead of my current tool?

Not yet. In SPL this is `| where amount>=1000 | stats dc(account)` and every downstream number
uses it. Here the filter is a real pipeline step, which is the right idea, and the "812 of 3,000"
chip at the top is something I'd want in every tool. But I got a stale edge count, a table that
opts out, a picture I couldn't tell had changed, and a second filter I didn't add. That's four
reasons to doubt the number. I'd still have to verify it in my notebook, so for now the notebook
stays my tool.

## Problems noticed

- After Enter, the summary kept the old edge count and stale readings until I pressed "Compute on
  812". "Every count" was not true by default.
- The summary's Edges row read "9,113 transfers" after recomputing, which contradicts the average
  degree and the step's own "1,204 of 9,113 edges".
- The edge table shows "9,113 edges (before the filter)" with sub-1,000 amounts in its first rows.
- The drawing looked the same before and after the filter.
- A second step, "kind is not merchant", and a "1 note" on my step showed up without my adding
  them.
- Clicking "amount" in the attribute menu took me to the left-list attribute's details instead
  of filling the condition.
