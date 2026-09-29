# Who matters -- Analyst Alex

**Participant:** Alex, operations data analyst at a logistics company. Computes centrality in
NetworkX, draws it in Gephi, pastes it into a monthly deck. Knows roughly what betweenness means,
could not derive it. Has been burned by numbers that changed on a rerun.

**Task as given by the moderator:** "You have the Les Miserables co-appearance network open. Find
the few characters who matter most to how the story hangs together, and tell me how sure you are
of their order."

**Screens seen:** the project at rest, the same project with sets, views and the table open, the
Results list, the betweenness run's own page, Valjean selected, the main menu, the measure
catalog and the search box (on the protein sample), a finished betweenness result and its table
(protein sample), the closeness variant result (protein sample), the Les Miserables table with
degree and betweenness side by side, the same table with ranks and a near-tie line (protein
sample), a result's own inspector page, and Les Miserables with Valjean filtered out and closeness
run on what is left. The protein and payments states were shown because they are the only data
those states are drawn on; Alex was asked to read them as if they were his.

Renders (study view, all in `../../../shots/`):
- `r6-alexwho-frame.png` -- project at rest
- `r6-alexwho-nav-new.png`, `r6-alexwho-nav-node.png`, `r6-alexwho-nav-menu.png` -- the project with
  sets, views, the table and Valjean selected; the main menu
- `r6-alexwho-nav-results.png`, `r6-alexwho-nav-run.png` -- the Results list and the betweenness run
- `r6-alexwho-rr-catalog.png`, `r6-alexwho-rr-quick.png` -- finding betweenness (protein sample)
- `r6-alexwho-rr-done.png`, `r6-alexwho-rr-rank.png` -- a finished run, one node picked (protein)
- `r6-alexwho-rp-finished.png`, `r6-alexwho-rp-table.png`, `r6-alexwho-rp-variant.png` -- a result
  with its tie sentence, its table, and the closeness variant (protein)
- `r6-alexwho-rp-compare.png`, `r6-alexwho-comparison.png` -- Compare with..., Compare rankings
  (patents and payments samples)
- `r6-alexwho-td-small.png`, `r6-alexwho-td-ranked.png` -- Les Miserables table; ranked protein table
- `r6-alexwho-ins-one.png`, `r6-alexwho-ins-result.png` -- a node and a result in the inspector
- `r6-alexwho-cv-b1.png`, `r6-alexwho-cv-b2.png` -- Les Miserables without Valjean, closeness

## Think-aloud

**Project at rest.** "Les Mis. 77 nodes, 254 edges -- that's the standard file, and it's right
there on the right, I don't have to go looking. One component. Good. 'Nothing has been sent from
this project' under the name -- OK, I'll take that, that's the first thing I'd want to know if this
was supplier data."

"Coloured by group. Group 2 at the top of the legend with 14, so that's the main lot -- Valjean's
people." *(The legend is sorted by count, not importance; he reads the first row as the main
group.)* "Labels are 'the 18 characters with the most connections'. So labels are degree."

"'value not used yet. Change...' Same as last time. The file has how many chapters two people
share, and nothing's using it. Parking that again."

**Looking at the picture.** *The table-open frame, where nodes are sized.* "Right, Valjean's the
big one in the middle. Gavroche, Marius, Javert are big. Myriel up in the corner is smallish, so
he's not a big deal." *Checks the style stack.* "Size: degree. OK so that's connections, not
betweenness. Fine, that's the picture. Picture says Valjean. But 'hangs together' is betweenness,
not degree. That's what I'd run."

**Finding betweenness.** *Protein sample, the moderator explains.* "I'd type it. 'centr', Run
Betweenness is first. Good. Last time there was a time estimate on the right of that list -- 'hours'
or whatever. I don't see it now. Closeness has 'WF-corrected' on it, Eigenvector has '3
components'. Nothing on betweenness. On 77 nodes I don't care, it's instant. On my real one I'd
care a lot. Did that go away, or does it only show when it's slow? I'd want to know before I click,
that was the whole point."

"The catalog's the same list, with a hover that says what betweenness is -- 'brokers and
bottlenecks'. Yes. That's the word I'd use to my director. 'Bottleneck.'"

**Results list, Les Mis.** "OK, this is better than last time. Results: Betweenness, today 14:02,
'Exact, normalized, no weight. Full graph, 77 nodes.' And Bridges from the 27th. So I can see it was
run, and how. Last time I had a betweenness column and no idea where it came from. That's fixed."

*Opens the run.* "Method exact, every node. Normalized yes. Undirected. Weight none. Ran 29 Sep
14:02. Re-run, Compare with. That's the run record. That's what I'd paste under the chart. Good."

"Top nodes: Valjean 0.57, Myriel 0.177, Gavroche 0.165. Three of them. And... that's it. No
sentence about ties. On the protein one there's a line, 'every step in the top 5 is over the 1% tie
line'. Here, on the actual data I'm asked about, nothing. So I don't know if Les Mis got checked
and it's fine, or if it just doesn't do it here."

**The table under it.** "Sorted by betweenness. Valjean 0.57, Myriel 0.177, Gavroche 0.165, Marius
0.132, Fantine 0.13, Thenardier 0.075."

*Stops.* "It's still doing it. 'Fantine 0.13' under 'Marius 0.132'. I said this last time. That
reads like Marius is two whole hundredths ahead when it's two thousandths. And Valjean's '0.57'
at the top of a column of three-decimal numbers. If I screenshot this, the gap between Marius and
Fantine looks bigger than it is. That's the kind of thing a director circles."

"Then the other table -- the one with ranks -- says 0.570 and 0.132, three places, nice and even.
So it's the same number printed two ways in two tables in the same app. Which one goes in the deck?
The ranked one, obviously. But I shouldn't have to pick."

**Valjean selected.** "Inspector: Attributes group 2, degree 36. Results: betweenness '0.57,
highest'. OK, so it's a result, not something from the file. In the ranked table's version of the
same selection it says betweenness 0.57 under Attributes again. Two screens, two answers to 'where
did this number come from'. Minor. But that's twice now."

**Les Mis, the ranked table.** "This is the one. Degree and rank of 77, betweenness and rank of 77,
side by side. 'Betweenness exact, unweighted, full graph' in the header. The line on top: 'Valjean is
#1 on both measures. At #2 they part: Gavroche by degree, Myriel by betweenness.' Yep. Same sentence
as last time, still the right sentence."

"Valjean #1 and #1, 0.570. Gavroche #2 on degree, #3 on betweenness, 0.165. Marius #3 and #4,
0.132. I can only see three rows before it cuts off; I'd sort by betweenness and scroll. From the
other screen I know the rest: Myriel 0.177, Fantine 0.13, Thenardier 0.075."

**The near-tie rule.** *Protein ranked table.* "Oh, here it is: 'Near tie: the next rank's value is
within 1%, so a small change in the data could swap them. "=" marks an exact tie.' And then '#6,
near #7' in the PageRank rank column. That's exactly what I wanted. On the protein data."

"So on Les Mis -- Marius 0.132, Fantine 0.130. That's, what, 1.5 percent? Just over 1%. So by its own
rule it's NOT near. No mark. And I'm sitting here thinking those two are the same number. The rule
says they're different, my gut says they're not, and the one percent -- I still don't know where
that comes from. Who picked 1%? If my director asks 'how do you know Marius is ahead of Fantine' and
I say 'the tool has a 1% line', that's not an answer. I'd rather it said 'within 2%' and let me
decide, or told me what would have to change to swap them."

"And there's this tooltip on 'Exact': 'computed on every node, not estimated. It does not say the
ranking is meaningful.' Ha. OK. Honest. But that's literally my question -- is the ranking
meaningful -- and the tool is telling me that's my problem. Which, fine, it is. But then give me
something to answer it with on Les Mis, not just on proteins."

**The weights.** "The file has shared scenes. The run says weight none. Would the order change with
it? Last time I asked whether it flips the weight into a distance, because betweenness wants a
distance and more shared scenes means closer, not further."

*The screen with Valjean filtered out.* "Wait -- '76 of 77 nodes, 1 step'. Valjean's gone. His label's
gone from the middle. Someone took him out. Seven components, five on their own, the bishop's lot
cut off in the corner. Actually that's a good test -- take the main guy out and see who holds the
rest together."

"And in the Results list: 'Betweenness, Distance = 1 / value.' There it is. It flips it. One over
the shared-scenes count. That's what I do by hand in NetworkX. Good -- that answers last round's
question. But I only found it on this one screen, on a filtered graph, and I never see the numbers
from that weighted run. I want that same run on the full graph, weighted, next to the unweighted
one. That's where Myriel versus Gavroche, Marius versus Fantine, would get decided."

"Closeness on the filtered graph: Javert 0.997, Enjolras 0.983, Courfeyrac 0.960, Marius 0.930.
Different list entirely -- it's the barricade kids plus Javert once Valjean is out. The 'WF-corrected'
thing -- the hover says each score is scaled by how much of the graph the node can reach. Seven
components, so OK, I see why. Clicking the word offers harmonic instead. I'd leave it. I'd not
put closeness in the deck anyway; I'd have to explain it."

**Compare with / Compare rankings.** "'Compare with...' on the run gives earlier runs and other
runs on the graph. So if I ran weighted, it'd be there. And 'Compare rankings...' opens a scatter,
rank against rank, 'Agreement: 0 of the top 50 in both', Spearman. That's on payments data, so I
can't read it for Les Mis. On Les Mis I'd expect Myriel way off the line -- #18 on degree, #2 on
betweenness. I'd use that picture for the 'depends how you measure it' slide."

## His answer to the moderator

"Valjean. Certain. Number one on connections and on betweenness, and on betweenness he's more than
three times the next person, 0.570 against 0.177. Nothing I rerun is moving him."

"Then four: Myriel, Gavroche, Marius, Fantine, in that order on betweenness. I'm not sure of that
order. Myriel's second only because he's the one door into the bishop's corner -- he's eighteenth on
connections. Gavroche is second on connections and third on betweenness, so if you want one safe
number two, it's him. Marius and Fantine I'd call a tie: 0.132 and 0.130. The tool doesn't call it
a tie -- it's just over its 1% line -- but I would. And all of this ignores how many scenes they
share. The tool can weight it, I saw it, so before this goes in a slide I'd run it weighted and put
the two side by side."

"Sentence for the director: 'Valjean holds the story together, by a mile. After him it depends
how you measure it: Gavroche is the best-connected, Myriel is the bridge to the bishop's household.'"

**Single Ease Question (1-7): 5.**

"What took longest was the same as last time: working out whether I can trust positions two to
five. It's easier now -- the run is in the list with its settings, I can see it's exact and
unweighted, and I found out it flips weights into distances. That's two of my three complaints from
last time gone. But the tie sentence and the near-tie marks are on the protein screens, not on Les
Mis, the table still prints 0.13 next to 0.132, and I can't tell who decided 1% is the line. I did
the 'is this a tie' maths in my head, which is what I do in NetworkX anyway."

**Would he use this instead of his current tool?**

"For this kind of question -- top few and why -- yes, probably, instead of the Gephi half. Degree
and betweenness ranked side by side with a sentence on top is the table I build in pandas every
time, and I don't have to redo the colours. I'd still check the betweenness numbers against
NetworkX the first time; if they match, I'm in. What would stop me: if the time estimate before
running is really gone, I'm not clicking betweenness on the 40k-node supplier graph blind again. And
I'd want the tie call on every ranking, not just the ones that happen to have it."

## Problems observed

1. **No tie statement on the Les Miserables result.** The betweenness run's page lists three top
   nodes and no sentence about gaps or ties; the protein result has one ("every step in the top 5 is
   over the 1% tie line"). Alex could not tell whether Les Mis had been checked. Severity: high for
   this task -- it is exactly "how sure are you of the order".
2. **Mixed decimal places in the Les Mis table under the navigation screens.** "0.13" under "0.132"
   and "0.57" above three-decimal values; the ranked table on the table screen prints 0.130 and 0.570.
   Same number, two formats, and the short form invents a visible gap. Raised in the previous round,
   still present. Severity: high (screenshot goes in a deck).
3. **The 1% tie line has no stated source.** Alex cannot defend "the tool's 1% line" to a director,
   and on Les Mis the rule leaves Marius (0.132) and Fantine (0.130) unmarked while he reads them as
   tied. Severity: medium.
4. **No time estimate before running betweenness.** The search list and catalog show nothing beside
   Betweenness, where the previous round showed an estimate. Alex relied on it for large graphs.
   Severity: medium to high (a reason not to switch).
5. **Weighted run only discoverable on a filtered graph.** "Distance = 1 / value" appears only on the
   Valjean-removed screen, without its numbers; there is no weighted full-graph run to compare with.
   Severity: medium.
6. **Where betweenness lives in the inspector differs.** Under Results ("0.57, highest") in one
   selection, under Attributes in another. Severity: low.
7. **Legend order read as importance.** Alex took group 2 (first row, 14) as "the main group".
   Severity: low; the legend is sorted by count and does not say so.

## What worked for him

- The betweenness run in the Results list with method, normalization, direction, weight and time --
  fixes his main complaint from the previous round.
- "Nothing has been sent from this project" under the project name.
- The ranked Les Mis table and its one-line summary ("At #2 they part: Gavroche by degree, Myriel by
  betweenness").
- The near-tie line and "#6, near #7" marks on the protein table -- the right idea, wanted everywhere.
- "Distance = 1 / value" -- answers the weight-flip question he would otherwise check in Python.
- The honest tooltip on Exact ("does not say the ranking is meaningful").
