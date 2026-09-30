# Session: see who an account deals with directly, on a small network and on one too large to draw

Participant: Sarah, fraud detection analyst (complex-case investigator at a mid-size bank; persona
in study/personas/fraud-analyst.md). Mode: first impression, not mandated -- she gives it about
five minutes per network.

Task as given by the moderator: "See who an account deals with directly, once on a small network
and once on one too large to draw."

Screens: the inspector mock (screens/inspector.html) and the frame past the drawing limit
(screens/past-drawing-limit.html). Renders read: shots/inspector-one-node.png,
shots/inspector-grow.png, shots/inspector-filtered.png, shots/record/inspector-cap.png,
shots/record/r3-rw-ia-inspector-c-directed.png, shots/record/screens__past-drawing-limit-not-drawn.png,
shots/record/screens__past-drawing-limit-narrow.png, shots/record/r3-sarah-neighbors-past-limit-rule.png and
shots/record/r3-sarah-neighbors-past-limit-full.png (the editor for "Around a node" is in the row of
small panels under the rule editor).

Note for the reader: the small network in the mock is a protein network, not accounts. The
moderator told her to treat the circled item, TP53, as "the account". The one account-shaped
inspector is the pinned merchant ACC-393859 on the transfers graph, shown in a crop at the bottom
of the inspector page.

## Part 1 -- small network

**First screen (one item selected, TP53).**

> "OK, this is not my data. Proteins. Fine, pretend TP53 is my account. It's already circled and
> the right-hand side is about it. Good -- I didn't have to go looking for it. On a real case I'd
> want to paste the account number somewhere first, and I don't see a search box on the picture
> itself. There's a magnifier on the table on the other screen, not here. Moving on."

> "Right panel. Name at the top, then a button that says Neighbors. That's the word for it, I
> guess. There's a tooltip: 'Filter to neighbors, 1 hop: 33 nodes. Ctrl+Z undoes it.' I like that
> it tells me the count and how to undo before I press anything. 'Nodes' -- that's developer talk,
> but I get it, it means accounts."

> "Hang on. Tooltip says 33. Further down, Connections, says '32 neighbors'. Which is it? ...
> OK, 33 is probably the account plus its 32. It should just say so. If I put 33 in a narrative
> and the reviewer counts 32, that's a QA finding."

**Opens the little arrow next to Neighbors.**

> "Hops. 1 hop 33, 2 hops 169, 3 hops 296. That's actually the question I ask -- how far out does
> this go. Then 'Filter to neighbors' and 'Select neighbors', both 33. I don't know the difference
> and I'm not going to read a manual. I want to see just them, so Filter."

**Presses Filter to neighbors (the filtered screen).**

> "There it is. The account in the middle, its direct contacts around it, everything else gone.
> The little box at the top left says 'Filtered: 33 of 300 nodes', and there's an Undo at the
> bottom. Good -- I know I'm looking at a subset and I know how to get back. That's better than
> i2, where I'd have to rebuild the chart."

> "Now: who does it deal with, and for how much? ... There's nothing on the lines. No amounts, no
> dates. The right panel is still telling me about 'betweenness' and 'pagerank' with 'Out of date
> -- Re-run'. I don't know what those are and I'm not re-running anything. Where's the money?"

> "The legend on the left groups them by colour -- 13 DNA repair, 4 this, 4 that. In my world
> that would be 'personal, business, merchant'. OK, useful, but still no totals."

**Looks at the account crop (ACC-393859, the merchant, directed graph).**

> "This one looks like my world. ACC-393859, merchant, pinned. Connections: In 907, Out 0, All
> 907. Now THAT I like -- money comes in from 907 accounts, nothing goes out. That's a sentence I
> can put in a narrative. Why doesn't the protein one split like that? ... because proteins don't
> send money, fine."

> "But 907 in and zero out tells me who, not how much. I'd still export this to Excel and pivot
> on counterparty to get totals. So the picture saves me the 'find the counterparties' step, not
> the 'add them up' step."

Result, part 1: done. Found the direct contacts in two clicks (Neighbors, or its menu and Filter
to neighbors). Workarounds she would need: export to Excel for amounts by counterparty; count
the counterparties by hand to reconcile 33 against 32.

## Part 2 -- network too large to draw

**First screen (patent citations, nothing drawn).**

> "Patents now. OK. Big grey box: '124,318 nodes not drawn. More than this browser draws at
> once (50,000). Every node is counted in Statistics and listed in the table.' Fine. At least it
> didn't freeze and it told me why. That's more than the vendor demo did."

> "So where's my account? No picture to click. There's a table underneath, sorted by citations,
> highest first. If my account were the busiest one it'd be at the top. It won't be. There's a
> magnifier on the table -- I'd click that and paste my account number. I assume that finds the
> row."

**Clicks Narrow the graph... (the filter steps list).**

> "'Suggested for this graph.' Top 3 by citationsReceived with neighbors -- 586. 'Favors hubs.'
> No, I don't want the top three anything, I want MY account. Second one: 'Around a node... a row
> you pick in the table, or find by name.' That's it, I think. 'Around a node' -- again the node
> word. If it said 'Around an account' or 'Around one item' I'd have seen it straight away. I
> nearly went for 'Add step' because that sounded like the normal thing."

**Opens Around a node (the editor, with 6117075 filled in).**

> "Around: 6117075. 1 hop. Both directions. '242 nodes, 348 edges -- will draw.' And a Filter to
> button. OK. It tells me before I commit that it will draw. Good."

> "Two things. One: that number was already filled in because a row was picked in the table. If
> I have to scroll a hundred-and-twenty-thousand-row table to find my account, forget it. The
> box looks like a dropdown -- can I paste into it? I'd try Ctrl+V and hope."

> "Two: 242 nodes, 348 edges. So 241 counterparties? And 348 -- is that transactions, or
> links? If there were 50 transfers between two accounts, is that 50 edges or one? I can't tell,
> and that's the difference between a mule and a payroll run. And 'Both directions' -- I'd want
> to switch that to in only, then out only, and see both counts. It says it's a dropdown, so
> maybe I can."

> "It also says 'the same step as Filter to neighbors on a node's inspector'. So it's the same
> button as on the small one. Fine, that's consistent. I'd have liked the small-network button
> just to be there on the table row -- click the row, press Neighbors -- instead of going
> through a filter menu."

**Presses Filter to (narrowed and drawn).**

> "Now it draws, the chip says it's filtered, and there's an Undo. Same as the small network.
> That's the second time it behaved the same way, which I'll give it credit for."

Result, part 2: done, with hesitation. The route is Narrow the graph..., then Around a node...,
then Filter to. She hesitated at the list because of the word "node" and because the offered
steps looked like "top N" analytics, not "find my account". Unresolved: whether she can paste an
account number into the Around field instead of picking a row; whether 348 edges means 348
transactions.

## Single Ease Question

**5 of 7.**

> "The small one was easy -- two clicks. The big one I got there, but I had to work out that
> 'Around a node' meant my account, and I'm still not sure I can paste the ID. And neither of
> them showed me a single dollar."

## Would she use it instead of her current tool?

> "Instead of Excel? No. Excel is where the money is, and nothing here showed me an amount or a
> date. Instead of i2 for the 'who does this account touch' picture? Maybe. It didn't choke on a
> hundred-and-twenty-thousand rows, it told me honestly it wouldn't draw them, and it got me to
> just my account's contacts with a count before I committed. i2 makes me import for half a
> day to get there. Put the amounts and dates on the links, split in and out on every account,
> let me paste the account number anywhere, and I'd ask my manager about it. Right now it
> finds the counterparties and I go and add them up somewhere else."

## Problems observed

1. No money on the direct-contacts view: no amounts or dates on links, no total per
   counterparty. She would export to Excel to answer "for how much". (Severity 3)
2. Past the drawing limit, the route to one account is "Narrow the graph..." then "Around a
   node...": the word "node" and the list heading "Suggested for this graph" hid it among
   analytics steps. She nearly chose Add step. (Severity 2)
3. The Around a node field is filled from a picked table row; it is not clear she can paste or
   type an account number into it. On a 124,318-row table picking the row is not realistic
   without search. (Severity 2)
4. Count mismatch on the small network: the Neighbors tooltip and menu say 33 nodes, the
   Connections row says 32 neighbors. The difference (the item itself) is never stated.
   (Severity 2)
5. "242 nodes, 348 edges" does not say how many counterparties there are, or whether an edge is
   one transaction or all transfers between two accounts. (Severity 2)
6. The in / out split (In 907, Out 0) appears only on the directed transfers crop; the Around a
   node editor defaults to "Both directions" and shows one combined count. (Severity 2)
7. "Filter to neighbors" and "Select neighbors" show the same count and give no hint of the
   difference. She picked Filter by guessing. (Severity 1)
8. After filtering, the right panel keeps showing betweenness and pagerank with "Out of date --
   Re-run", which she neither understands nor wants. Noise. (Severity 1)

## What worked for her

- The tooltip on Neighbors gives the count and the undo before she presses.
- The hop menu (1, 2, 3 hops with counts) matches how she thinks about reach.
- The filter chip ("Filtered: 33 of 300 nodes") and the Undo toast: she always knew she was
  looking at a subset and how to get back.
- The large network did not freeze and said plainly why nothing was drawn.
- "Will draw" on the editor before committing.
- The same step and the same behaviour on both sizes of network.
- The account crop's "In 907, Out 0" -- a sentence she can put in a narrative.
