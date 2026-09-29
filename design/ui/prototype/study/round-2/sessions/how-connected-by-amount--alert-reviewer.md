# Session: how two accounts are connected, weighted by amount -- alert reviewer (Nadia)

Task given by the moderator: "Starting from two selected accounts, find how they are connected,
weighted by amount, and get the transfers with amounts and dates out."

Screens used, in order: the inspector mock (two nodes selected, Paths between...), the sets and
paths mock (Path tool, Found path, What amount means), the bottom dock table mock (edge rows,
Export table as CSV...).

Outcome: partial. She found a path and got three transfers with amounts on screen. She never saw
a path that was actually weighted by amount, and there were no dates anywhere to take out.

## Transcript (thinking aloud)

**Inspector, two nodes selected.**

"OK, this is proteins. TP53, SMAD3. I'll pretend they're my two accounts. Right side says
'2 selected' and there's a big blue-outlined button, 'Paths between...'. That's the only thing
on this panel that looks like it answers 'how are these two connected', so I click it."

"A box opens. From TP53, To SMAD3 -- good, it filled them in, I didn't have to paste anything.
'Weight by: None: count hops.' Hops. One hop from what? I think it means how many transfers in
a chain. I want amount, so I open that dropdown." (Mock shows no amount column in the protein
data; she assumes it would be there for transfers.) "Then Run. 'Every shortest path is found and
drawn together.' Fine, I'd rather see all of them than one."

**Sets and paths, Path tool.**

"Now it's accounts, March transfers, this is more like it. From ACC-271813, To ACC-233575. Run
is grey. There's a yellow warning on 'Filtered graph' and a line under it: 'From is outside the
filtered graph. Set Scope to Full graph to search it.' I didn't filter anything -- somebody did,
it says 'Filtered: 1,071 of 3,000' up top. OK, I switch Scope to Full graph. Annoying but at
least it told me what to click."

"Weight says 'amount (unknown role)'. Unknown role? It's the amount. It's dollars. What role
would it have? I'll leave it, I assume it uses amount since it says amount."

**Sets and paths, Found path.**

"Three hops. 271813 to 946224 to 242954 to 233575. And the table at the bottom switched to
Edges with the three transfers: $3,530.28, $9,782.05, $9,616.72. That's actually what I want to
see -- two of those are just under ten thousand, that's the thing I'd write down."

"But the header says 'Found path (unweighted)' and on the right: 'Paths ignore amount: hops were
counted, not dollars.' So it did NOT use amount. The box said amount and it quietly didn't. If I
hadn't read the small grey line I'd have put 'weighted by amount' in my alert file and QA would
catch it later, or worse, not."

"'Ties: 1 of 2 as short.' So there's another path of the same length. Where? I don't see an
arrow to step to it on this one. The protein one had '1 of 12' with arrows. Here I'd have to
guess. I'd probably just not look at the second one, honestly."

**Sets and paths, What amount means.**

"I click the Weight row because that's where the problem is. 'amount: what it means. A bigger
amount means... similarity: larger = closer. Read as a distance by 1/w, so a path prefers big
transfers.' 1/w. I don't know what that is. 'Similarity'? These are payments. Do I want big
transfers to be close? I guess? The path that moves the most money is the interesting one. I
leave it on similarity because I don't understand the others, and 'Other conversions' sounds
like maths."

"'Applies to every result that reads amount.' Does that mean I just changed something for
everyone? Is this changing the data or just my view? I don't know. That makes me nervous in a
bank system."

"Then... what? Does the path redo itself now? Nothing here shows me the weighted path. I'd
expect it to re-run and say 'weighted by amount' instead of 'unweighted'. I don't see that
happen, so I don't know if I'm done."

**Table dock, getting it out.**

"The Edges tab has step, source, target, amount. No date. The task says dates. Every transfer
has a date in our system, it's the first thing QA asks -- when. There's no date column here and
nothing that says where the date went. Maybe the file didn't have it, but it doesn't say so."

"To get it out: I look for export. Top right 'Export files...' -- that's the blue one, I'd click
that first. But from the table page, that's pictures and the graph, not tables. The table one is
'Export table as CSV...' next to the tabs. Two export buttons. I'd have clicked the wrong one."

"The CSV dialog says 'Rows: All 300: Nodes, full graph'. I want the three transfers on the path,
not 300 nodes. I'd have to be on the Edges tab with the path selected, and I'm trusting the
dialog would say '3 edges' then. I didn't see that version, so I don't know."

"Honestly, for my file I'd screenshot the path with the three amounts in the table and type the
dates in from the core banking screen. That's what I do now anyway."

## Single Ease Question

3 of 7.

"Finding a path was easy, the button was right there. Getting it weighted by amount -- I'm not
sure I ever did. And there are no dates. So I did half the task and I'm not confident about the
half I did."

## Would she use it instead of her current tool

"For a normal alert, no -- I don't need a picture to clear tuition. For the one where two
accounts are linked through a middle account, maybe, the path with the three amounts in a row is
nicer than four tabs of the case system. But only if it says in plain words that it used the
amount, and gives me the dates, and one button puts the picture and those rows in my alert file.
Right now I'd spend longer figuring out 'unknown role' than clearing the alert. Day twenty-nine,
I'm not learning 1/w."

## Problems observed

1. Weight shows "amount" in the Path tool, but the result is unweighted; the only clue is a small
   grey line. She would have recorded the wrong method. (Severity 4)
2. "unknown role", "similarity: larger = closer", "1/w" mean nothing to her; she picked a
   setting she did not understand. (Severity 3)
3. After setting what amount means, nothing shows the path re-run as weighted; she could not
   tell whether she was done. (Severity 3)
4. No date column on the path's transfers and no word about why. (Severity 4)
5. Two export buttons; she reached for Export files... first, which does not export rows. The
   CSV dialog she saw defaults to all nodes, not the path's transfers. (Severity 3)
6. "Applies to every result that reads amount" made her unsure whether she had changed shared
   data or only her view. (Severity 2)
7. Scope blocked Run because of a filter she had not set; the fix line was clear. (Severity 2)
8. "Ties: 1 of 2" with no visible way to step to the other path. (Severity 2)
