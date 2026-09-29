# Session: weight end to end -- analyst Alex

Participant: Alex, operations data analyst at a logistics company (study/personas/analyst-alex.md).
Does the numbers in NetworkX, the picture in Gephi. Gives a new tool about five minutes, and spends
them checking whether it will embarrass him in front of his manager.

Task as given, and nothing more: "The transfers have an amount on each one. Find the cheapest route
between two accounts and the most central accounts, and tell me what each answer used."

Material worked from: the main frame with the March transfers loaded, the sets-and-paths screens
(the Path tool, a found path, the path's own editor), the run-and-read screens (the catalog, the
money measures on the transfers, a finished run), the quiet weight trap screens (betweenness with a
weight column, on the Les Miserables sample), the results place and the table dock. Renders were
read in the study view (design notes hidden); page HTML was read only to see what a control offers
when opened.

Renders used (all in shots/): r6-alex-we2e-frame-at-rest.png, r6-alex-we2e-far-s5.png,
r6-alex-we2e-sp-s3.png to r6-alex-we2e-sp-s6.png, r6-alex-we2e-rr-money.png,
r6-alex-we2e-rr-money-read.png, r6-alex-we2e-run-and-read.png, r6-alex-we2e-weight-role-trap.png,
r6-alex-we2e-rp-finished.png, r6-alex-we2e-table-dock.png.

## Think-aloud

**1. The file is open (main frame at rest).**

"OK. Transfers, March 2026. First thing -- counts. 3,000 nodes, 9,113 edges (rows), 9,113 linked
pairs. So no duplicate rows, fine. I'd check that against SQL, but say it matches.

"'Nothing has been sent from this project.' Good, that's the first thing I look for, and it's up at
the top where I load the file. I clicked the file chip -- 'Projects are kept in this browser.'
Fine. I'd still ask IT, but that's a sentence I can forward.

"Now -- right there under Statistics: 'Loaded: transfers-2026-03.csv, direction followed, amount not
used yet. Change...' Huh. OK, that's actually the thing I'd have gotten wrong. In Gephi I'd assume
the weight column got picked up because it's called weight. Here it's telling me flat out it
isn't using amount. I like that. 'Not used yet' -- yet, meaning what, it'll use it when I ask?

"'Change...' -- is that where I set the amount as the weight? I'd probably click it. I don't really
know if I'm supposed to set it here once, or somewhere per algorithm. I'll leave it for now and see
what the path thing does, because the task says route first."

**2. Finding the route tool.**

"Where's shortest path. I'd type it -- Quick actions, Ctrl+K, 'shortest'. There's also a toolbar
icon down here, the one that looks like two dots with a squiggle. No label. I hovered it in my
head -- I'm guessing that's path. On the next screen it's highlighted and there's a From / To bar,
so yes.

"From ACC-271813, To ACC-233575. Scope says 'Filtered graph' with a warning: 'From is outside the
filtered graph. Set Scope to Full graph to search it.' OK, that's nice, it didn't just say 'no
path'. Gephi would've just given me nothing.

"Weight: 'amount, not used yet'. So it knows amount is the weight column but it's not going to use it
unless I tell it. What's in that dropdown? I can't see it opened here. I'd expect 'amount' and
'none'. The Run button's grey because of the scope thing. I switch scope to full graph, run."

**3. The first path comes back.**

"Found path (unweighted). 3 hops. OK, it says unweighted right in the title, that's honest. And on
the right: 'Paths ignore amount: hops were counted, not dollars.' Good. That's the sentence. If I
had pasted this into a slide I'd have been wrong and this stopped me.

"Ties: '1 of 2 as short'. Oh, that's good -- there's another 3-hop path it didn't pick. I want to see
the other one. Can I? I don't see how. I'd click that row and hope.

"Table at the bottom switched to Edges, 3 rows, step 1, 2, 3, with the amount on each. $3,530.28,
$9,782.05, $9,616.72. So this route costs about twenty-three grand. That's not cheap. That's just
the fewest hops.

"Also -- in the Weight row on the right it says 'amount, not used yet'. For a finished result I'd
rather it said 'not used'. 'Yet' on something already computed reads like it's still going to do
something."

**4. Making it the cheapest route.**

"There's a Re-run on the card. Clicked the path result, got a little editor: Weight 'amount', and
then 'In this run, a bigger amount means:' and a dropdown. This one has 'a closer or stronger link'
picked and underneath 'Distance = 1 / amount. The path prefers big transfers.'

"No no no. I want cheapest. That's the opposite. If that's the default -- wait, is it a default, or
did someone pick it? I don't know. I'd have hit Re-run and got the path through the biggest
transfers, and called it the cheapest. That'd be bad.

"What's the other option. From the other screen [the betweenness one on the sample data] the
list is 'a longer or costlier step -- Distance = value' and 'a closer or stronger link -- Distance =
1 / value'. 'Costlier step.' OK, costlier is my word. Costlier step, distance equals amount,
shortest distance equals smallest total dollars. That's the cheapest route. That I get.

"'Distance = value' is a bit mathsy but honestly it's the line I'd trust -- that's literally what
NetworkX does when I pass weight='amount'. I'd want it to just say that, 'same as NetworkX with
weight=amount', and I'd be done worrying.

"So: pick 'a longer or costlier step', hit Re-run. And then... I don't get to see the answer. There's
no screen of the cheap path. I'd expect the title to lose the '(unweighted)' and say something like
'Distance = amount', and the Edges table to show the new hops and hopefully a total. Right now the
table doesn't give me a total for the path, I'm adding it up in my head. There's a 'Sum of amount'
thing on the table page for selected rows, so maybe I select the three rows. Two more clicks for a
number the path should just have."

**5. Most central accounts.**

"Now 'most central'. For me that's betweenness -- who is the money routing through. I'd type
'betweenness' in Run a measure. The catalog I saw is on some protein data, not my transfers, but
same menu I assume: Degree, Centrality -- Betweenness, Closeness, PageRank...

"I typed 'money' on the transfers one too, out of curiosity. 'Money in -- total amount of the
transfers into each account', 'Money out', 'Money in minus out', and then separately 'Counts of
transfers, not money'. That's really clear actually. Money in is weighted degree, I know that, but
I like that it doesn't make me know that. Top account ACC-393859, $440,784. And a line saying
ACC-893168 is #3 by money but #37 by count -- 'fewer and larger'. That's the kind of sentence I
actually put in a deck.

"But that's not 'central'. My director says central, they mean betweenness. So, betweenness with
amount. The sample screen shows it: Weight 'value', and the Run button is grey until I answer 'In
this run, a bigger value means'. Hover says 'Choose what a bigger value means first.' Fine. It's one
more click, but it stops me doing the dumb thing, so I'll take it.

"And here's where I actually have to think. For the route I said bigger amount = costlier. For
central -- is a big transfer a strong link, money flows along it, so it should count as short? I
think yes, 'closer or stronger link', Distance = 1 / amount. So the same column means opposite
things in my two runs. Is that allowed? The form says 'In this run', so apparently yes, it's per
run. OK. I'd be nervous, though, explaining to my director why amount is a cost in one slide and a
strength in the next. The tool lets me do it and records it, which is more than Gephi does. It
doesn't help me decide which is right -- I'm on my own for that.

"On the sample, they ran it both ways. Run 1 'Distance = value', Run 2 'Distance = 1 / value', and
the top list changes -- Gavroche drops from #2 to #7, Marius comes up to #2. That's a real
difference. Good that both runs sit there in the Runs list with the choice written next to them.

"One thing threw me: after they changed the dropdown on Run 1, the run list said 'Run 1. Out of
date' and the table column said 'Out of date'. Out of date? The data didn't change. I just changed a
setting I haven't run yet. 'Out of date' sounds like my numbers are wrong now. I'd rather it said
something like 'settings changed, not re-run'."

**6. What each answer used.**

"This is the bit the task actually asks. Where do I read it?

"For the path: the card on the right. Query shortest path, Scope full graph, Weight amount, the
line about hops versus dollars, Direction follows transfers, Ties 1 of 2. That's complete. That's
basically my footnote.

"For betweenness: the run list says 'Distance = value' or 'Distance = 1 / value'. The finished run
page [protein example] says 'Exact. Undirected. WebGPU.' and under Options 'Weight: None for this
run'. But up top it also says 'Weight: confidence, not used yet. Change...'. That's two lines about
the same weight, one says 'none for this run' and one says 'not used yet'. Which one's the run and
which one's the file? I'd figure it out but it's a double take.

"The table column is best: 'Betweenness exact, unweighted, full graph'. If I export that, does
that header come along into Excel? I'd check. If it does, that's the thing I'd actually rely on,
because the CSV is what gets forwarded."

**7. The 'Change...' at load.**

"Coming back to the 'amount not used yet. Change...' on the main screen. I never used it. Every
run asked me itself. So what is that Change for? If I set amount there, does it stop asking me per
run? Does it pick a meaning for everything? I don't know, and I wouldn't click it now that I've got
the per-run thing working, because I don't want it changing my runs behind my back."

## His answer to the task

"Cheapest route: rerun the path with Weight amount, 'a longer or costlier step', so distance
equals amount and it minimises total dollars. The first path it gave me, 3 hops, about $22,900,
was fewest hops, not cheapest -- and it said so. I can't tell you the cheap route's total because
I didn't get to see it.

"Most central: betweenness on the full graph, directed, amount read as 'closer or stronger link',
distance equals 1 over amount. I'd also run it unweighted and put both in, because the top list
moves. If the director means biggest money hubs, that's Money in, and ACC-393859 is top at
$440,784.

"What each used: the path card and the run list tell me, and the table column header says it. I
trust that more than I trust myself to remember."

## What worked for him

- "Amount not used yet" on the main screen, right after load. He read it and it changed his
  expectation before he ran anything.
- The found path's title "(unweighted)" and the line "Paths ignore amount: hops were counted, not
  dollars." He called it "basically my footnote".
- The word "costlier" in the meaning question mapped straight onto "cheapest"; "Distance = value"
  let him check it against what NetworkX does.
- The Run button refusing to run betweenness until the meaning is chosen. "One more click, but it
  stops me doing the dumb thing."
- The money measures named in money words, with counts kept apart, and the "#3 by money, #37 by
  count -- fewer and larger" sentence.
- Every run in the list carrying its choice ("Run 2. Distance = 1 / value"); the table column
  header naming "exact, unweighted, full graph".
- "Ties: 1 of 2 as short", and the scope warning that said why no path was found.

## Where he stalled or guessed

- The path editor he saw had "a closer or stronger link" already chosen, with "The path prefers big
  transfers". He could not tell whether that was a default. Had he pressed Re-run without reading,
  he would have reported the most expensive route as the cheapest. He caught it only because he
  read the line under the dropdown.
- He never saw the weighted path's result, so he could not report its total or confirm the title
  changed from "(unweighted)". The found path has no total amount; he added the three amounts in
  his head and would have selected rows to get a sum.
- The same column read as a cost in one run and a strength in the next. The design lets him do it
  and records it, but gives him nothing to decide which is right for centrality. He expects to be
  asked why by his director.
- "Out of date" on a run whose settings he had only edited, not re-run. Read as "my numbers are
  wrong now".
- "Weight: amount, not used yet" on a finished path, and on the finished run page both "Weight:
  confidence, not used yet. Change..." and "Weight: None for this run". "Yet" on a finished result
  reads as pending; two lines on one fact made him stop.
- "Change..." on the main screen's load line: he could not tell whether it sets the weight once for
  every run or does something else, and chose not to touch it for fear it would change his runs.
- The Path tool's toolbar icon has no label; he found it by guessing and by the From / To bar that
  appeared.
- He could not see how to show the second of the two tied paths.
- The betweenness-with-a-weight screens were on the Les Miserables sample and the finished-run
  screens on proteins, not on his transfers; he had to assume the same form appears on the
  transfers.

## Single Ease Question

**4 out of 7.**

"The warnings are good -- better than anything I've got. It kept telling me when it wasn't using
amount, and that's the thing that's burned me. But the one moment that mattered, picking what
bigger means on the path, I nearly got backwards, and then I didn't get to see the answer. And I
still had to work out myself whether money's a cost or a strength for centrality. So: it stopped
me being wrong silently, it didn't make me right."

## Would he use it instead of his current tool?

"For this? Not instead. Alongside, maybe. I'd still compute the betweenness in NetworkX, because
I know exactly what weight='amount' does there and I can rerun it. But I'd check it here, and if
the numbers match I'd use this for the picture and the path, because Gephi never tells me what
weight it used and this writes it on every run and on the column. If that column header survives
into the Excel export, and the path shows me its total, that's the Gephi half of my week gone.
That'd be worth a lot."
