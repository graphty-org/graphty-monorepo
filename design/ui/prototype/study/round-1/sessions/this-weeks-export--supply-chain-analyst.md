# Session: "This week's export arrived" -- supply chain risk analyst

Participant: Dana Okafor (composite persona), supply chain risk analyst at an industrial
equipment maker. Lives in Excel and Power BI; brings a weekly ERP export of Tier 1 suppliers,
sites, parts, spend and lead time.

Task as given by the moderator: "This week's export arrived. Do what you did last week, and show
your manager what changed."

Screens, in the order she met them: the load step (open dialog and the "Add data" dialog), the
results panel, version history, and the side-by-side comparison.

Outcome: failed. She got the new file in, but could not find where "what changed" lives and
had nothing she could hand her VP. Ease rating (1 very hard to 7 very easy): 2.

## Transcript (thinking aloud)

**1. The start screen.**

"OK, 'Open a graph.' Recent: 'Card and transfer transactions, February'. That's not mine. Where's
my supplier file from last week? I'd expect it to say 'Supplier network, week 38' or whatever I
called it. I'll pretend that's mine.

I don't want 'Open'. Open means start over. I want 'update with this week's file'. There's no
'update' or 'refresh' anywhere on this page. In Power BI I hit Refresh and the same report fills
with new numbers. That's what I'm looking for."

**2. She clicks Open... and gets the import dialog.**

"Format, 'Each row is -- An edge.' I don't know what an edge is. My rows are supplier-part lines.
'Ends -- from_account, to_account.' Whatever, it's guessed something. 'Direction: Directed.' Fine.

Amount... 'amount as a weight means Similarity, Distance, Capacity, Unknown.' I don't know. It's
dollars. It's spend. None of those is 'spend'. I'll leave it on Unknown, which is apparently what it
is. And the grey line under it, 'Paths ignore it; PageRank and communities read it as a
similarity' -- I skipped that. Too small, and I don't know what PageRank is.

The good bit: the sample table on the right. I read tables. First five rows, 9,113 rows total,
'What will load: 3,000 nodes, 9,113 edges.' Nodes, I guess suppliers. I can check that against my
pivot -- if I have 3,000 suppliers-and-sites I'll believe it.

But hold on. I did all this last week. Why am I choosing the column types again? If I have to
redo this every Monday I'm going back to Excel."

**3. She finds the "Add data" version of the dialog (the screen shown with the saved project
behind it).**

"This is more like it. 'Add data from transfers-2026-04.csv.' It remembered the columns, it
just shows them. 'Accounts in the file: matched 2,961, new 132.' That's useful. That's exactly the
first thing I'd want: how many suppliers are the same, how many are new.

But where's 'dropped'? If a supplier fell off the list this week I need to know that more than I
need to know the new ones. A supplier disappearing is either a data error or we lost them. And
'After the merge: 3,132 nodes, 17,483 edges'. Wait. Seventeen thousand? I don't want last week's
lines PLUS this week's lines. That's double counting. This week's export replaces last week's.
'Adds 132 nodes and 8,370 edges to 3,000 and 9,113' -- no. That's wrong for me. I'd have just
doubled my spend.

Is there a 'Replace' button? I don't see one. Cancel or Add data. I'd probably click Add data
because it's blue, and then my numbers are wrong and I wouldn't know until the VP asked why spend
doubled."

(Moderator note: the mock's dialog states that the same dialog also handles Replace data, but no
control for Replace is visible on either render she saw.)

**4. Results panel.**

"Different data now -- 'Human protein interactions'. OK, pretend. The list on the left: Connected
components, Betweenness. Catalog: Centrality, Closeness, Eigenvector, HITS, Katz, PageRank,
Girvan-Newman, Leiden, Louvain... I'm not clicking any of this. I don't know what these words are
for. Betweenness, I've heard it in a webinar, it's the chokepoint thing. That's the one I'd have
run last week, maybe.

There's a 'Run' button that's greyed out and 'Options wait for Run'. So did it run or not? The
banner at the top says 'Finished'. The panel says Run is disabled. Confusing.

'Top nodes: 1. MAPK1 0.1370' -- a ranking with a decimal nobody in my building understands. What
do I tell the VP, 'this supplier has a betweenness of 0.14'? He'll ask 'so what'. There's no
column for spend, lead time, what parts it touches. And where is 'last week it was #4'? Nothing
on this panel says what changed. It's just this week.

Export button top right -- good, I'd click that later. The legend text at the bottom, 'Log scale;
the 10 proteins at 0 take the lightest color', is grey and tiny. I'd need my glasses."

**5. Version history.**

"'Version history.' I would not have found this on my own -- I got here because the moderator's
list had it. Where's the button? There's no clock icon I noticed; it just is open here.

OK: 'April data, current, today 09:14.' 'Replace data from transfers-2026-04.csv.' So there IS
a replace. It just wasn't on the dialog I saw. Below: 'accounts 3,093, transfers 8,370, found by
id 2,961 of 3,000, new in April 132, not in April 39, rows dropped 0.' THAT is the table I want.
New 132, gone 39. That's the headline for the manager. I'd copy these numbers straight onto a
slide.

Then 'Results: Louvain communities replayed: 65 communities, was 35.' I don't know what a
community is here and 35 to 65 sounds alarming but I can't tell if it's bad. Then a grey box of
paragraphs, 'Methods, one sentence per run' -- that's for a researcher. Skip.

What I actually need: WHICH 39 dropped out and WHICH 132 are new. Names. A list I can filter by
country. I see counts, not names. Can I click '39'? Nothing tells me I can.

'Export log' -- is that the list? It says log. I'd try it and probably get something I can't
read in Excel.

Clicking 'March data' shows me last month's picture and a 'Restore this version' button. Two
nearly identical hairballs, one after the other. I cannot see the difference with my eyes, and
neither can my VP."

**6. The comparison screen.**

"Two pictures side by side. 'PageRank' and 'Betweenness', 'April data'. The second example is
the one I want -- 'March transfers against April transfers', one measure on two versions -- and the
text says 'the list opens with the account that climbed furthest, from #1,575 to #88'. Now THAT is
a 'what changed' view: the biggest movers. That's what a manager wants: who moved up the risk
list.

But how did I get here? Nothing on the other screens said 'Compare' or 'Compare with last week'.
And the page itself says in bold 'Not buildable yet' and 'Compare with... is absent from the app'.
So the one screen that answers my task doesn't exist. OK.

And it's still 'Spearman rank correlation 0.781'. My VP doesn't know Spearman. I barely do. 'top
50 in both, 0 of 50' -- that one I get. The Differences table -- account, A, B, gap -- that's
readable, I like that. Can I get it out to Excel? 'Export...' is apparently hidden in a three-dot
menu. I'd look for it on the table itself and not find it.

The two hairballs again. Nobody puts two hairballs on a slide."

**7. Wrap-up. Moderator: "How would you show your manager what changed?"**

"Honestly? I'd take the numbers from the version history -- 132 new, 39 gone -- type them into
PowerPoint, and then go to Excel and do a VLOOKUP between last week's export and this week's to
get the actual names. Which is what I do now. Ten minutes.

This tool knows the answer -- it counted them -- it just won't show me the names or give me the
table. And I never answered 'is anything new a chokepoint' because I don't know which of those
methods to rerun or whether it reran them for me. It says 'replayed' for one of them. Did it
redo Betweenness too? No idea.

And the same two questions as always: will IT approve it, where does my supplier file go when I
drop it in, and can the table go into Power BI? Nothing I saw tells me."

## Ease rating

2 of 7. "Getting the file in looked OK once it remembered my columns. Showing what changed, I
couldn't do."

## Would she use it instead of her current tool?

"No. Not for this. My weekly comparison is a VLOOKUP and a pivot, and it gives me names. This gave
me counts, words I don't know, and two hairballs. The 'new 132 / gone 39' panel is nice and the
biggest-movers table would be the reason to switch, if I could reach it, if it had names and spend
on it, and if it went to Excel or Power BI. Today it's a side tool at best, and IT would still
need to sign off."

## Problems observed

1. Load step, first screen: no "update with this week's file" or refresh entry; Open reads as
   "start over". Severity 3.
2. Add data dialog: merging adds this week's lines on top of last week's (17,483 edges), which
   for a weekly snapshot doubles spend; no Replace choice is visible, and Add data is the
   primary blue button. She would have clicked it and not noticed. Severity 4.
3. Add data dialog: counts new records but not records that disappeared; the dropped suppliers
   are what she most needs. Severity 3.
4. Import dialog: "Each row is an edge", "nodes", "weight means Similarity / Distance /
   Capacity" -- no word for spend; she guessed Unknown. Severity 2.
5. Import dialog on a returning project still asks for column types again. Severity 2.
6. Results panel: nothing says what changed since the last version; the ranking is a decimal
   score with no business columns (spend, parts) and no previous rank. Severity 3.
7. Results panel: "Finished" banner while Run is greyed with "Options wait for Run" -- unclear
   whether the result is current. Severity 2.
8. Version history: not discoverable from the other screens; shows counts (132 new, 39 gone) but
   not the names, and nothing says the counts can be opened. Severity 3.
9. Version history: "Louvain communities replayed: 65, was 35" with no meaning for her; unclear
   which of last week's analyses were re-run. Severity 2.
10. Comparison: the screen that answers the task ("biggest movers March to April") has no
    visible entry point from results or history and is marked not buildable. Severity 4.
11. Comparison: Spearman correlation is the headline figure; export of the differences table is
    in an overflow menu, not on the table. Severity 2.
12. Throughout: grey 11px text (legend notes, hints) is hard to read without glasses. Severity 2.
13. Throughout: nothing answers where the supplier data goes or whether it can reach Power BI.
    Severity 3.
