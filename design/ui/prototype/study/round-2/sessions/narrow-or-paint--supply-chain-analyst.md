# Session: look only at the biggest connected piece -- Supply Chain Network Analyst

Participant: Dana, supply chain risk analyst at an industrial equipment maker. Lives in Excel and
Power BI; tried a Power BI network visual and Gephi and gave up on both. Not a network scientist:
says "chokepoint" for betweenness and has never said "component". Mild presbyopia, browser at 110%.

Task as given by the moderator: "Look only at the biggest connected piece, and tell me its size and
who matters most in it."

Screens: the filter chip and its steps (starting on the state the page opens on), the main window
at rest, and the Results panel (its "Results after a filter" state, rendered for the session).
The data on every screen is the Les Miserables character network (77 characters), not supply
chain data; the moderator said to treat characters as suppliers.

Outcome: success, with difficulty. Dana gave the right size (76 of 77) and a top list led by
Valjean, but only after first reading a wrong number (28) off the Statistics panel, and she could
not say what Valjean's score of 0.547 meant.

## Part 1 -- the filter chip, as the page opens

"OK. Les Miserables. Fine, I'll pretend these are suppliers. There's already a box open in the
middle -- 'Filter steps'. Three rows with checkboxes. 'Filter to Largest component, 76.' 'Filter to
degree >= 5, 41.' 'Filter out group = 8, 28.'"

"'Largest component.' I don't use that word. But 'largest'... and he said 'biggest connected piece',
so I'm guessing that's the one. Is 76 the size? Probably."

"Then there's a sentence under the second row: '3 dropped below degree 5 by Filter out group = 8.'
I read that twice. I don't know what it's telling me, and I don't think I need it. Moving on."

"Right side, Statistics. 'Filtered graph: 28 of 77 nodes.' 'components 1.' 'largest component 28.'
OK so -- wait. The box says the largest component is 76 and the panel says the largest component is
28. Which one is it? If I'd come in here cold and just read the right side, I'd have written down
28. I nearly did."

"I think what's going on is someone left other filters on. He said look ONLY at the biggest piece,
so I don't want the degree one or the group one. I'll untick those two."

(Moderator note: the participant unticked steps 2 and 3. The chip read "Filtered: 76 of 77 nodes -
1 step" and the picture lost one dot on the left. Statistics read 76 with the small funnel mark.)

"There. 76 of 77. One dot disappeared, the little lonely one on the left. So the 'biggest connected
piece' is... basically everything. Seventy-six out of seventy-seven. That's a bit of an anticlimax,
but fine, that's the answer. Size: 76."

"The little funnel icons next to the numbers on the right -- I get it now, it means 'this number is
after your filter'. I didn't notice them the first time. They're tiny and grey-ish. At 110% on my
laptop I'd miss them."

**What she did not see, and the moderator asked about afterwards.** Asked how she would have done
it starting from no filters, Dana opened the "No steps" state: "Full graph" chip, box open, "No
filter steps. Every number reads the full graph." and "Add step". "I'd click Add step. Then it's
'Filter to: Largest component, k-core..., Rule...'. Largest component -- again, I'm guessing that's
my 'biggest connected piece'. k-core I would not touch; I don't know what that is. If it said
'Keep the biggest connected group' I wouldn't have to guess."

(Moderator note: the editor for that step does say "Keeps the largest connected piece of the graph
this step reads." -- but only after the step has been added and opened; the menu item itself has
no explanation.)

"Also on the plain main screen, the right panel says 'Connected components: 2 (1 isolate)'. 'Isolate'
-- I'd guess that's the lonely dot. So I could have got the size from there if I'd done the maths:
77 minus 1. But nothing there says 'the biggest one is 76' in words."

## Part 2 -- who matters most

"Now who matters. My first instinct is the table at the bottom. It's sorted by 'degree'. Valjean 18,
Fantine 12... no, that was with the old filters. With just the big piece on, the degree column and
the full-graph one should be the same. Valjean's at the top either way. Degree is -- how many
connections, I think. That's 'who has the most suppliers', not 'who's the chokepoint'."

"For chokepoint I want the betweenness thing. There's a flask on the left called 'Results'. Click."

(Moderator note: the Results panel, "Results after a filter" state.)

"Catalog. 'Centrality: Betweenness, Closeness, Eigenvector, Harmonic centrality, HITS, Katz,
PageRank.' That's a wall of words. I know Betweenness from a webinar -- chokepoint. The rest I would
never click. None of them say what question they answer."

"I click Betweenness. The box says 'on: filtered graph, 76 nodes, 1 component'. Good -- that's the
bit I actually care about: it did it on MY piece, not the whole thing. And the Scope dropdown says
'Filtered graph, 76 of 77'. I like that it tells me. In Power BI I never know what a visual is
filtered by."

"Top nodes: Valjean 0.547, Gavroche 0.163, Myriel 0.151, Marius 0.131, Fantine 0.127. So Valjean,
by a mile. That's my answer: Valjean matters most, then Gavroche, Myriel."

"But what is 0.547? Is it a percent? 55 percent of something? If I put '0.547' on a slide my VP will
ask what it means and I'll have nothing. I clicked 'Details'."

"'Brandes betweenness, exact: every node is a source.' 'Divided by (n-1)(n-2)/2 = 2,775 node
pairs.' No. That's for someone else. I closed it. What I want is one line like 'Valjean sits on 55%
of the shortest routes between other characters'. If that's what it means, say it."

"And the distribution bit: 'zero: 46 nodes, all 31='. What's 'all 31='? Forty-six of them score zero?
So most of the network doesn't matter at all by this measure? That's actually interesting, but I
don't know what '31=' is."

"'71 more in the table' -- good, I'd want the whole list. Can I get that into Excel? There's 'Export
files...' up top. I'd try that next. If it's a CSV, fine."

**Her answer to the moderator:** "The biggest piece is 76 of the 77 -- everyone except one character
who isn't connected to anybody. Who matters most in it: Valjean, by a long way, then Gavroche and
Myriel. By 'betweenness', whatever the exact number means."

## Single Ease Question

**4 of 7.** "Middle. The answer was there, but I nearly wrote down 28, and I'm still not sure what
0.547 is. The filter box itself was OK once I figured out I had to untick the other two."

## Would she use this instead of her current tool?

"For this? Maybe, as a side tool. The one thing it did that Power BI doesn't: it told me every
number was on the filtered piece, with the little funnel and the 'on: filtered graph' line. That's
real. Excel can't do 'biggest connected piece' at all without me building it by hand."

"But: the words. 'Largest component', 'k-core', 'Katz', 'HITS'. I'd click one of those out of seven.
And the scores don't explain themselves. And -- same questions as always -- will IT approve it,
where does my supplier list go, and can I get the table into Power BI. It said 'This browser.
Nothing sent.' on the main screen; that helps with IT. If the table exports to CSV, I'd use it for
the 'where are our chokepoints' question. Not instead of Power BI. Next to it."

## Problems observed

1. **Statistics read a wrong answer before the filter was cleaned up (severity 3).** On the page as it
   opens, the step list says the largest piece is 76 and the Statistics panel says "largest
   component 28". Dana nearly reported 28. The panel's "largest component" was computed after all
   three filters, but it reads as a property of the graph.
2. **"Largest component" is unexplained where it is chosen (severity 2).** The Add step menu offers
   "Largest component" and "k-core..." with no sentence; the plain-language line "Keeps the largest
   connected piece" appears only inside the step's editor after it has been added.
3. **Betweenness score has no plain meaning (severity 3).** 0.547 with a technical "Details" record
   (Brandes, (n-1)(n-2)/2) gave her nothing she could put on a slide.
4. **Catalog of centrality names with no business question (severity 2).** Seven measures, one of
   which she recognised; she would not click the others.
5. **Filter mark is small and easy to miss (severity 2).** She did not notice the funnel beside the
   Statistics numbers until after the filter was changed; tiny at 110% zoom on a 14-inch screen.
6. **"zero: 46 nodes, all 31=" is unreadable (severity 2).** She could not decode "31=".
7. **The step-interaction sentence was noise (severity 1).** "3 dropped below degree 5 by Filter out
   group = 8" -- read twice, not understood, ignored.
8. **Answer to the task is not stated in words (severity 1).** "Connected components: 2 (1 isolate)"
   and "76 of 77" had to be put together by her; nothing says "the biggest connected piece holds 76".
