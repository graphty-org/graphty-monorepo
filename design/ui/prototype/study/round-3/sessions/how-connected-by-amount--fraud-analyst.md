# How two accounts connect, weighted by amount -- Sarah, fraud analyst

Participant: Sarah, complex-case financial crime investigator (persona:
study/personas/fraud-analyst.md). Simulated session.

Task as given by the moderator: "Starting from two selected accounts, find how they are
connected, weighted by amount, and get the transfers with amounts and dates out."

Patience mode: moderated task. She keeps going past her usual five minutes because the moderator
asked, and says where she would have quit on her own.

Screens seen, in order (study view, design notes hidden where a render was made for this session):

1. screens/inspector.html, state 8, "Two nodes: TP53 and SMAD3, Paths between..." --
   shots/record/r3-dana-howconn-inspector-two.png
2. screens/inspector.html, state 11, a found path -- shots/record/r3-dana-howconn-inspector-path.png
3. screens/sets-and-paths.html, the March transfers states: path tool (3), found path (4), what
   amount means (5), no path (6) -- shots/sets-and-paths-s3.png, sets-and-paths-s4.png,
   r3-sarah-howamt-snp-s5.png, sets-and-paths-s6.png
4. screens/table-dock.html, "Getting rows out" and "The Edges tab" --
   shots/record/r3-sarah-howamt-tabledock-out.png, shots/record/r3-sarah-howamt-tabledock-edges.png

## Transcript (think-aloud)

**Inspector, two selected.**

"OK. This is proteins, not accounts. TP53, SMAD3. Fine, I'll pretend these are my two accounts.
Right side says '2 selected'. Statistics: 'edges between 0'. So they don't transact directly.
Good to know, that's actually the first thing I'd want."

"There's a blue button, 'Paths between...'. That's the one. I click it."

"A little box: From TP53, To SMAD3, and a swap arrow. 'Weight by: None: count hops.' The
moderator said by amount, so I open that dropdown."

(Moderator: the dropdown in this mock does not open; in the product it would list the edge
columns.)

"So I'd pick amount. Assume it's there. What's 'Undirected' up top? 'On: full graph, 300 nodes.
Undirected.' Money has a direction. If it's ignoring who paid whom, that's not a flow of funds,
that's a phone book. I'd want to know that before I press Run, not after."

"Run."

**Inspector, found path (proteins).**

"'Found path, 3 hops, 1 of 12.' Twelve? Twelve equally short paths and it shows me one. Fine,
there are arrows to step through. The list down the side is in walk order with a number next to
each... 'log2FoldChange' -- no idea, protein stuff. Skip. Let me get to the version with money."

**Sets and paths, March transfers -- the path tool.**

"Now this is closer to my world. 'March transfers, 3,000 nodes.' Accounts ACC-something. There's a
bar at the bottom: From ACC-271813, To ACC-233575, Scope, Weight."

"Weight says 'amount (unknown role)'. Unknown role? It's an amount. It's dollars. What role would
it have? I don't know what it wants from me here."

"And Run is greyed out. Yellow warning on Scope: 'From is outside the filtered graph. Set Scope to
Full graph to search it.' OK, somebody filtered this to risk score 20 or more and my From account
has a risk score of 1. At least it tells me what to do. I'd switch it to Full graph. That's
reasonable -- actually that's a good catch, in i2 I would just get nothing and not know why."

**Found path.**

"Here's the path drawn. Start, three hops, end. Arrows on the lines -- good, direction. Right side
says 'Found path (unweighted)'. Wait."

"'Weight: amount (unknown role).' And then under it: 'Paths ignore amount: hops were counted, not
dollars.' So I told it amount and it... didn't use amount. It says so, I'll give it that, it didn't
lie to me. But I asked for a weighted path and I got an unweighted one, and the thing that tells
me is grey small print under a row I wasn't reading. If I'd been in a hurry I'd have put this in
the file as 'the path by amount'."

"'Ties: 1 of 2 as short.' So there's a second route. Where's the second one? I only see one
line on the chart."

"Down in the table: step, source, target, amount. $3,530.28, $9,782.05, $9,616.72. Good, money in
dollars, in order. That's nearly ten grand in and out -- that's my pattern. But where's the date?
I need the date on every one of those. Account opened Tuesday, money out Wednesday -- order is the
whole case. No date column."

**What amount means.**

"There's a highlighted Weight row, I click it. A box: 'amount: what it means. Applies to every
result that reads amount. For amount, a higher number means [a closer or stronger link]. A path
prefers big transfers.'"

"'A path prefers big transfers.' OK, that sentence I understand. That's what I want -- follow the
big money. The 'closer or stronger link' bit is somebody else's language, but the line under it
translates it. 'How it is converted' -- no. Not opening that."

"'Applies to every result that reads amount.' Every result? What else reads amount? Is it going to
change something I already did? That makes me nervous. I want this for this path, not
everything."

"Then what? I close the box. Does the path redraw? The right side still says 'unweighted', still
'3 hops'. I don't see a Run button here. Do I have to go back to the bottom bar and run it again?
I'd guess yes. I'd go back and press Run."

(Moderator: the mock does not show the re-run or the weighted result.)

"So I never actually saw a path weighted by amount. I saw a path by hops, and a box where I told it
what dollars mean."

**No path.**

"This one: ACC-233575 to ACC-271813 -- the other way round. 'No directed path; one exists ignoring
direction. [Ignore direction].' That's honest. Money didn't flow that way. I would not press Ignore
direction for a SAR, though; the reviewer would ask me which way the money went and I'd have made
it up. Good that it's a button and not automatic."

**Getting the transfers out -- table dock.**

"Now I need the rows out. On the path screen the table has a magnifier and three dots. No export
button I can see. I'd try the three dots. Probably in there."

"On this other table page there's 'Export table as CSV...' right on the bar. That's what I want.
Why isn't it on the other one?"

"This one: 'Selected: 5 edges on 2 paths.' from_account, to_account, timestamp, hop, amount, 'on
paths 2 of 2'. There it is -- the timestamp, 2026-03-04 18:23, right after the two accounts. That's
the table I wanted. Both routes, five transfers. The first transfer is on both paths, that's what
'2 of 2' means, I think. Hop 2 happens on the 7th, hop 3 on the 8th and 9th -- in order. Good. That
I could paste into the narrative."

"'timestamp: UTC'. My case system is Eastern. Somebody's going to get a transfer on the wrong day
around midnight. At least it says UTC."

"Amounts here have no dollar sign, on the other screen they did. The CSV header says 'amount
(USD)' -- fine, that's actually better for Excel."

"The export dialog: 'Rows: All 300: Nodes, full graph'. That's the protein one. For mine I'd
expect 'Rows: 5, Edges, selected' or similar. It tells you what it's going to write before it
writes it -- good, I'd check that number. File name box. Export. Done."

"And then I'd open it in Excel and total it, because nothing here told me the total that moved
along the path. Three hops, $3,530 in, $9,600 out -- that's not even the same money, is it? The
first hop is smaller than the rest. I'd need to see what else came into ACC-946224 that week.
That's the real next question and nothing here offers it."

## After the task

**Single Ease Question: 4 of 7.**

"Middle. Finding a connection between two accounts: easy, one button. Getting the rows with dates
out: fine once I was on the right table. 'Weighted by amount': I never actually got it. I got
hops, a warning that said hops, a box asking me what dollars mean, and no sign it had rerun. The
'unknown role' thing is the part that would make me stop."

**Would you use this instead of what you use now?**

"For this job -- two accounts, how are they linked -- maybe, alongside Excel, not instead of it.
In i2 I'd be building this by hand from the statement export, so a tool that finds the route and
hands me the five transfers with timestamps in path order saves me real time on a mule case. But
I'd still take the CSV to Excel to total it, and I'd still check it's direction-aware every time,
because the first screen said 'Undirected' and the second said 'follows transfers' and I had to
read both to know. And I'm not the one who picks it -- IT has to say customer data can live in
it. The 'Nothing is sent' on the left helps with that conversation."

## Problems observed

1. Weight set to amount, result says "unweighted" and "hops were counted, not dollars" in small
   secondary text. The participant asked for a weighted path and received an unweighted one; the
   headline "3 hops" and the drawn path look identical to a weighted result. Severity 3.
2. "amount (unknown role)" on the path tool's Weight field is meaningless to her; she did not know
   the tool wanted a decision until she found the box by accident. Severity 3.
3. After answering "what amount means", nothing tells her the path is still unweighted or offers
   Run again in the same place; she guessed she must go back to the bottom bar. The weighted
   result was never seen. Severity 3.
4. The found path's edge table (step, source, target, amount) has no date or time column, though
   the table-dock page's path rows do. Dates are the first thing she needs. Severity 3.
5. "Ties: 1 of 2 as short" but only one route is drawn; the second is only found in the table's
   "on paths" column on another page. Severity 2.
6. Export table as CSV is visible on the table-dock bar but hidden behind "..." on the path
   screen's table. Severity 2.
7. "Applies to every result that reads amount" worries her that an earlier result will change.
   Severity 2.
8. Inspector's Paths between box states "Undirected"; the transfers screen says "follows
   transfers". She had to read both to trust direction. Severity 2.
9. No total along the path, and no hint of what else flowed into the middle account, so the
   first hop's $3,530 versus the later $9,600+ hops is left unexplained; she exports to Excel to
   work it out. Severity 2.
10. Timestamps are UTC with no local-time option; risk of a transfer landing on the wrong day in a
    narrative. Severity 1.
11. Amount shows "$" on one table and no currency on the other. Severity 1.

## Workarounds she named

- Switch Scope to Full graph because the From account was filtered out.
- Go back to the bottom bar and press Run again after answering what amount means (guessed).
- Export the path's transfers to CSV and total them in Excel.
- Check direction by reading two different places.
