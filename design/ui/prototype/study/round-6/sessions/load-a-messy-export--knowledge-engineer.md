# Session: load a messy export -- Min-ji, knowledge graph engineer

Task as given by the moderator: "Your bank's case system just exported March's transfers as a
spreadsheet file. Bring it in, and tell me whether what you are looking at is what you think it is."

Participant: Min-ji (persona: study/personas/knowledge-engineer.md). Viewport 1440 by 900. Screens
seen, in order, as the participant sees them (design notes hidden):

1. shots/r6-minji-lme-transfers-not-read.png -- the export as an Excel workbook, refused
2. shots/r6-minji-lme-transfers-ready.png -- the same export saved as CSV, two issues
3. shots/r6-minji-lme-transfers-amount-policy.png -- the amount issue's list opened
4. shots/r6-minji-lme-transfers-loaded.png -- right after Load, the weight question open
5. shots/screens__frame-at-rest-dataset-transactions.png -- the same project at rest, later
6. shots/screens__data-panel.png -- the Data panel for the same file
7. shots/screens__load-step.html#too-large.png -- another file's open dialog, which the moderator
   showed after the task because I asked what happens when a file is big

Context she brings: this is not her kind of data. It is a flat edge list of transfers, not RDF, so
her usual first test (does it know a class from an instance, does it keep literals off the canvas)
barely applies. She said so up front and judged it on her second and third habits instead: what
does the tool think the data is, and do its counts reconcile with a count she can make herself.

## Think-aloud

### 1. Bringing the file in

"A spreadsheet from the case system. That will be an .xlsx. Let me just give it that."

(Could-not-open screen.) "'Excel workbooks are not read.' Fine. Clear, names the file, tells me
nothing changed. I respect a tool that refuses instead of guessing."

"But look at the advice: 'In Excel, save the sheet as CSV.' That is exactly the step I do not
want anyone doing with bank data. Excel will reformat the timestamps to whatever the locale
likes, strip leading zeros off an account number if one is numeric, and turn a long reference into
1.23E+15. Then your import very honestly reads the damaged file. You are sending me through the
one tool that silently rewrites values, and then the next screen will tell me '0 rows dropped' as
if that means nothing changed. It means nothing changed after Excel was done with it."

"Here the account ids are 'ACC-' strings, so they survive. The next export might not be. I would
rather the case system gave me CSV directly, and I will ask for that. Moving on."

### 2. The open dialog

"'Open transfers-2026-03.csv.' Format CSV, comma, header row. Source column from_account, target
column to_account. Good, it found the two ends. That is the question I care about first: what is
a node here. Nodes are accounts, edges are transfers. Correct."

"'Id column: None: ids are the account names.' They are not names, they are account numbers.
Small thing, but a tool that calls an identifier a name is going to call a predicate an attribute
eventually. And what did it read the ids AS? On the other columns there is a 'Read as'. On
from_account and to_account there is nothing. If it read ACC-000123 and ACC-123 as the same
thing, or trimmed whitespace, or folded case, I need to know. There is no line saying how many
distinct values each column has, either. I would like 'from_account: 2,9xx distinct, to_account:
2,9xx distinct, 3,000 in the union' so I can see where the 3,000 comes from."

"Other columns: amount, read as Currency (USD), role Weight. timestamp, Date and time, role Time.
Date and time in which zone? The case system writes local time or UTC depending on who configured
the job. There is no zone shown anywhere and the sample shows no offset. For March that matters:
daylight saving started in the middle of the month. If I ever filter by hour this is a silent
error."

"Issues, two. I read these properly."

"'amount is written as currency text. All 9,113 values carry a dollar sign, and amounts over a
thousand a comma. Marked in the sample.' Good. It says ALL 9,113, so it checked every row, not the
first five. What it does not say: are any negative? Reversals and refunds in an export are
usually written as minus or in parentheses, (1,240.00). Did it see none, or did it not look? 'All
9,113 values carry a dollar sign' suggests it would have told me about parentheses, but I am
inferring, and I do not like inferring about money."

(Opens the amount list.) "'Read as Currency (USD): 9,113 weighted edges. \"$1,240.00\" becomes
1240. Total $14,156,522.28. Every value kept.' Now THAT is useful. A total. I can take that number
to the case system, sum the amount column there, and if it says $14,156,522.28 I know the parse is
right to the cent. That is a known-answer check handed to me without asking. Honestly the best
thing on this screen."

"But why is it hidden inside a dropdown? I only found the total because I opened the list to read
the other option. It should sit under 'What will load' next to nodes and edges: sum of amount. A
reconciliation number that lives in a menu is a number most people never see."

"'Keep as text: unweighted edges. Measures that use weights treat every transfer as equal.' Fine,
clear consequence. I keep currency."

"Second issue: '412 extra parallel edges. Some pairs of accounts made more than one transfer; 412
rows repeat a pair already read. Keep all: 9,113 edges.' Parallel edges, a multigraph. Correct
term. Keeping them is right for transfers; each is a separate event. And it tells me it did not
de-duplicate silently -- that is what I check first in every importer. Good."

"What are the other choices in that list? The render only shows 'Keep all'. If one of them is
'merge and sum amounts', I would want the total to stay $14,156,522.28 under that choice too, and
I would want it to say so."

"Also: self-transfers. Any rows where from and to are the same account? That is a self loop,
and in a bank export it is often an internal sweep that should not be there. The dialog does not
mention it, which could mean zero or could mean it did not check. Same question as the negatives.
When an import lists its checks, I want the ones that came back zero listed too, as zero."

"Sample, first 5 of 9,113 rows, amounts as written. Fine. What will load: nodes 3,000, edges
9,113, rows dropped 0."

"3,000. Exactly three thousand accounts in a month of a bank's transfers. That is a suspiciously
round number. The first thing I think is 'is that a cap?' I have been burned by a display limit
that pretended to be a count. Nothing here says 'all distinct accounts in the file' or 'no
limit applied'. It is probably real -- the edges are not round -- but a round node count with no
explanation is exactly what makes me open pandas and count it myself."

"Load is focused and nothing blocks. I click Load."

### 3. After Load

"Toast: 'transfers-2026-03.csv read: 3,000 nodes, 9,113 edges', with Undo. Good."

"The canvas: a grey hexagon cloud. Is position meaningful? I assume not. It is a hairball drawn
as density, which is the honest thing to do with 3,000 unlabelled accounts, and I ignore it. I do
not need it to answer the moderator's question."

"Right panel, Statistics. nodes 3,000, edges 9,113, components 1, isolated 0."

"One component. For one month of retail transfers I would expect lots of small islands --
two customers who paid each other once and nobody else. One giant component and zero isolated
nodes means something connects everybody. And there it is: 'highest total degree 907'. One
account touches 907 of 9,113 transfers, ten percent. That is a clearing or suspense account, or a
payroll account, or it is an entity-resolution problem in the case system where several accounts
got one number. Either way that one node is why the graph is one component. I want to click 907
and see which account it is. It does not look clickable. That is the single most important number
on the screen and it is a dead end."

"Density 0.00101. Let me check: 9,113 over 3,000 times 2,999 is 0.001013. So density counts the
parallel edges as separate. Defensible for a multigraph, but it should say so; with 412 repeats,
distinct-pair density is lower. Average total degree 6.08: two times 9,113 over 3,000 is 6.075.
Consistent. Good, the numbers agree with each other here."

"'Last import: 9,113 rows, 0 dropped.' '412 parallel edges, kept.' The import decisions stay on
screen after the dialog is gone. That is what I want; in most tools the import report disappears
the moment you click OK."

"'Directed; amount, not used yet.' Directed -- nobody asked me. It is right for transfers, from and
to, but the other open dialog I saw had a Direction control and this one did not. I only learn it
after the fact. Acceptable because it is stated, but it should be in 'What will load'."

"'amount, not used yet'? In the dialog amount had Role: Weight. Now it is 'not used yet' and there
is a question: 'For amount, a higher number means...' with similarity, distance, capacity, or
don't use it. So the dialog's 'Weight' was not really a decision. Two screens say two things about
the same column."

"The question itself is a good question. No tool has ever asked me what the weight MEANS; they
just feed it into whatever algorithm and a shortest path over dollar amounts comes out nonsense.
For transfers the honest answer is capacity -- more money can pass through. I pick 'more can pass
through'. I like that nothing is preselected."

"'4 attributes.' Which four? amount and timestamp are two. Are from_account and to_account counted
as attributes? I would not count endpoints as attributes."

### 4. Later: the project at rest and the Data panel

(Frame at rest, same file.) "Nodes 3,000 nodes. Edges 9,113 edges (rows). 'Linked pairs: 9,113
linked pairs.'"

"Stop. The dialog told me 412 rows repeat a pair already read. So distinct linked pairs is 9,113
minus 412, which is 8,701. This screen says 9,113 linked pairs. One of these two screens is wrong,
or 'linked pairs' means something I do not understand, and the tooltip icon next to it is the only
way to find out. That is the kind of mismatch that ends my trust. If the tool's own two numbers do
not agree, I cannot take either of them to the case team."

"'Attributes 9, 5 more.' Right after load it said 4 attributes. Now 9. Maybe computed values were
added later by some run -- then say so, 4 from the file, 5 computed. Otherwise that is a second
number that changed without a reason."

(Data panel.) "Sources: 'transfers-2026-03.csv, 9,113 rows, one edge each; repeat pairs are not
merged. Read Apr 2.' That line is exactly right. from_account 'Where each transfer starts',
to_account 'Where each transfer ends', amount 'numbers, USD', timestamp 'Date and time'. Still no
time zone. Right side calls them 'accounts 3,000' and 'transfers (rows) 9,113'. I prefer that
vocabulary to nodes and edges for this data, but pick one per screen; the Statistics panel says
nodes."

"Versions: 'March data, current, Apr 2, from transfers-2026-03.csv.' Good, it knows which file
this came from. That is provenance, of a kind."

"Nothing has been sent from this project. Assistant off, nothing is sent. Good, that is the first
thing my compliance people would ask."

### 5. Is it what I think it is?

"Mostly yes. Accounts are nodes, transfers are edges, direction is from to to, repeats are kept,
amounts are parsed, nothing dropped, and it gave me a dollar total I can reconcile. What I cannot
confirm from the tool alone: that 3,000 is every distinct account and not a limit, what time zone
the timestamps are in, whether any amounts were negative, whether any rows are self-transfers, and
which account has degree 907. And I have one contradiction I cannot explain: 412 repeated pairs on
one screen, 9,113 linked pairs on another."

"So my answer to the moderator: the shape is what I expected, with one hub that probably should not
be there, and one count I do not believe until someone explains it."

(Asked about big files, the moderator showed another file's dialog.) "'124,318 nodes will not be
drawn. The table, Find and Statistics work as usual; the canvas opens empty.' Told before load, not
after the tab freezes. That is the right behaviour. I would still ask what happens at ten million
rows, but that is the right sentence."

## Single Ease Question

5 of 7. Getting the data in was easy once it was a CSV, and the import told me more than most
tools do. The lost points: the Excel detour for a spreadsheet export, a reconciliation total hidden
in a menu, and the linked-pairs count that contradicts the parallel-edge count.

## Would I use this instead of my current tool?

"No, not instead. Alongside. For this I would normally do a pandas groupby and a count, and I
would still do that, because I need to reconcile against the case system and the tool does not
show me distinct counts per column or let me click the hub. What I would use it for is the look:
one component, one account with 907 transfers, that is visible here in a minute and it took me
longer in a notebook. If the linked-pairs number is fixed and the 907 is clickable, I would open
this before the notebook, not after."

## Findings, in her words and the moderator's

1. Linked pairs contradicts parallel edges. The load dialog says 412 of 9,113 rows repeat a pair;
   the project at rest shows 9,113 linked pairs, which should be 8,701 if it means distinct pairs.
   Two numbers for one fact, unexplained. For this participant one unexplained mismatch ends trust
   in every count. (frame-at-rest, transfers dataset)
2. The dollar total ($14,156,522.28) is the best reconciliation check in the flow and it is only
   visible inside the amount issue's dropdown. It belongs with nodes, edges and rows dropped under
   What will load, and in Last import afterwards. (load-transfers, amount policy)
3. The could-not-open advice routes a bank export through Excel's Save As, which is where values
   get silently rewritten (dates reformatted, leading zeros stripped, long numbers in scientific
   notation). The message should warn about that or suggest asking the source for CSV.
   (load-transfers, could not open)
4. The amount column's role reads "Weight" in the dialog and "not used yet" after load, with a
   question asking what a higher number means. The question is good; the dialog's word "Weight"
   makes it look like a decision was already made. (load-transfers ready vs loaded)
5. "highest total degree 907" is the most important number for "is this what I think it is" (one
   account in ten percent of transfers, the reason there is one component) and it cannot be
   followed to the account. (load-transfers loaded)
6. 3,000 is a round node count with nothing saying it is the full distinct count and not a limit.
   No per-column distinct counts to show where 3,000 comes from. (load-transfers ready)
7. Checks that came back zero are not listed: negative or parenthesised amounts, self-transfers.
   Without them she cannot tell "none found" from "not checked". (load-transfers ready)
8. Timestamps have no time zone anywhere: dialog, sample, Data panel. March crosses a daylight
   saving change. (load-transfers, data-panel)
9. Attribute count changes from 4 right after load to 9 at rest with no explanation of where the
   other five came from; and whether endpoints count as attributes is unclear. (loaded vs
   frame-at-rest)
10. Direction is decided without a control in this dialog (another file's dialog has one) and only
    reported after load. Stated, so acceptable, but it belongs in What will load. (load-transfers)
11. Minor vocabulary: "ids are the account names" for account numbers; nodes versus accounts used
    on different panels for the same count.

What she liked: the Excel refusal is honest and says nothing changed; "All 9,113 values" (every row
checked, not the sample); parallel edges named correctly and kept, not silently merged; Last import
and the parallel-edge mark stay in Statistics after the dialog closes; the weight-meaning question
with nothing preselected; the Data panel's "repeat pairs are not merged" line; the too-large
warning before load; "Nothing has been sent from this project".
