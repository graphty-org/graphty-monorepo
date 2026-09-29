# Session: a weight read the wrong way -- Analyst Alex

**Participant:** Alex, operations data analyst. Uses NetworkX for the numbers and Gephi for the
picture. Mild red-green colour vision deficiency.

**Task, as the moderator gave it:** "The Les Miserables edges carry a number. Rank the characters,
then tell me whether you trust the ranking and why."

**Screens seen, in order:** the weight trap page, states A1 to A6 (shots
`screens__weight-role-trap-a1--study.png` to `-a6--study.png`, and
`tasks/quiet-weight-trap/01-weight-role-trap.png` for the load step); for comparison, the node
table with its ranks (`screens__table-dock--study.png`), the main menu's Algorithms list and the
Run a measure menu on the protein project, and the data panel on the payments project.

**Outcome:** success. Alex answered the "bigger value means" question correctly on the first try,
because the answer he needed ("such as a count of shared scenes") was written on the option itself
and the graph's Statistics already said "value, shared scenes". The moderator then walked him
through what the wrong answer would have produced, to test whether he would have caught it. He
thinks he would have, but only just. His trust in the final ranking is qualified: he wants an
unweighted run beside it and a rank-against-rank view before it goes in a deck.

---

## Transcript (thinking aloud)

### 1. Opening the file (A1)

> miserables.json. Les Mis, the one from every NetworkX tutorial. Left side says "Assistant Off.
> Nothing is sent." OK, noted.

> "Read as JSON, nodes and links. Nodes 77. Edges 254, undirected. Isolated nodes 0." 77 and 254,
> that's what `les_miserables_graph()` gives me. Good, the import didn't eat anything.

> Then a histogram: "Edge attribute value, whole numbers, 1 to 31; most edges 1 to 3." Long tail,
> that looks right for scene counts. And a line: "A measure that reads value asks, each time it
> runs, what a bigger value means."

> Huh. So it's not asking me now. It's warning me it'll ask later. I actually like that -- I don't
> know what I'm going to run yet, so how would I know now. Load. One click.

### 2. Picking betweenness (A2)

> "Choke points" -- well, "rank the characters". For me that's betweenness first, degree as a
> sanity check. Degree's already in the table, sorted: Valjean 36, Gavroche 22, Javert 17. Fine.

> Catalog on the left, Centrality, Betweenness. Clicking it.

> A little form. Scope: Full graph, 77. Weight: value. "In this run, a bigger value means:"
> Choose... And the Run button is greyed. Hover on it: "Choose what a bigger value means first."

> OK, so it won't let me skip it. Part of me says "just run it", but honestly that's what NetworkX
> does and that's how people get wrong numbers without knowing. Fine. One extra click.

> Glancing right while I'm here: Statistics, "Weight: value, shared scenes, 1 to 31". So the tool
> already knows it's shared scenes. Good -- that's the thing I need to answer this.

### 3. The question (A3)

> Choose... opens. Two answers.

> "a longer or costlier step -- Distance = value."
> "a closer or stronger link -- Distance = 1 / value, such as a count of shared scenes."

> Second one. It literally says "count of shared scenes" and that's what this is. More scenes
> together means they're closer, not further apart. And "1 / value" -- that's exactly what I'd do in
> Python, make a distance column as one over the count and pass that as the weight. So it's doing
> the thing I'd do by hand. Nice that it tells me the formula.

> The first one's highlighted when the menu opens, by the way. If I'd been tabbing through and hit
> Enter I'd have got "longer or costlier step" without reading anything. I didn't, but I can see
> someone doing that at four o'clock on a Friday.

> Where's "no weight"? I'd like a plain unweighted run too, to check against the number I remember.
> I guess that's under the Weight dropdown above, "value" -- maybe there's a "none" in there. I
> can't see what's in it from here. I'll pick my answer first.

> "a closer or stronger link". Run's live now. Run.

*(He did not open the Weight field, so he never saw whether an unweighted choice exists. It is
there as "None for this run" per the page's own design, but nothing on the form says so.)*

### 4. The ranking (A6, as he would have seen it)

> Runs list: "Betweenness 10:15, Run 2. Distance = 1 / value." Well, for me it'd be run 1, but
> fine, the moderator says the screen is borrowed.

> Table, sorted by betweenness: Valjean 0.795, Marius 0.499, Myriel 0.224, Fantine 0.193,
> Courfeyrac 0.177, Thenardier 0.172, Gavroche 0.102. Header says "0 to 0.795" and above the table
> "Sorted by betweenness, Run 2". Good, it names which run the column is.

> Valjean on top, sure. Marius second -- he links the students and Cosette's lot, that's believable
> once strong ties count as short. Gavroche way down, because his ties are lots of weak ones to the
> barricade crowd. That actually makes sense to me.

> Valjean at 0.795. I remember 0.57 from the tutorials, but that's unweighted. So I can't check
> this one from memory. That's the part that bugs me.

> The picture didn't change. Valjean's the big dot, same as before I ran anything. There's a colour
> legend for "group" but nothing that tells me what the size is. I'd assumed size meant betweenness
> after a run. It doesn't, I think it's still degree.

### 5. The moderator: "Suppose you had picked the first answer." (A4, A5)

> OK. So A4: "Run 1. Distance = value". Valjean 0.454, Gavroche 0.285, Javert 0.193, Myriel 0.177,
> Thenardier 0.129.

> Honestly? That looks fine. Javert third, he chases Valjean the whole book. I'd have believed it.
> No warning, no red anything.

> Would I have caught it? The run row says "Distance = value", and on the right it still says
> "Weight: value, shared scenes". If I read both, yes -- scenes as a distance is backwards. But
> "Distance = value" is small, it's under the name, and it's the kind of line I stop reading after
> the third run. So... maybe. If I didn't know Les Mis, probably not.

> A5: I click the result, same form, I change the answer to "a closer or stronger link". Button
> becomes "Re-run (keeps Run 1)", the run says "Out of date" with a warning icon, the table header
> says "Out of date" too. Good -- Gephi would just leave the old numbers sitting there looking
> valid. And "keeps Run 1" means I can put both in the deck and explain the difference. I like that
> it doesn't throw the old one away.

> Still, the old numbers are still in the table while it's out of date. 0.454 in plain black. If
> someone screenshots at that moment, that's what goes in the deck.

> A6: two runs listed, each with its formula. That's the audit trail I want. But the table only
> shows Run 2's column. I'd want both columns side by side, or ranks, to show "Javert goes from 3rd
> to way down" -- right now I'd be eyeballing two screenshots.

### 6. Looking for a way to check it

> On the other table screen (the node table with ranks), there's a column header "Betweenness
> exact, unweighted, full graph" with Valjean 0.570, rank #1, and a link "Compare rankings...". That
> 0.570 is my number. So an unweighted run exists somewhere, and the header says how it read the
> weight -- great, that's what I want on the Les Mis one. And "Compare rankings" is exactly the
> check I'd do: weighted rank against unweighted rank.

> But on the Les Mis run form nothing pointed me there. I'd have to know to open Weight and pick
> none, run again, then find Compare rankings in the table. That's three things I discovered by
> looking at other screens.

> The protein menu hover on Betweenness: "How often a node lies on the shortest paths between other
> nodes: the brokers and bottlenecks." Good. I could say that to my director.

---

## The answer Alex gives the moderator

> "Ranked by betweenness, with value read as shared scenes, so more scenes means closer: Valjean,
> Marius, Myriel, Fantine, Courfeyrac, Thenardier, Gavroche.

> Do I trust it? Mostly. I trust it because it made me say what the number means before it would
> run, the option told me in plain words that a count of shared scenes is the 'closer' kind, and the
> result itself carries 'Distance = 1 / value', which is exactly what I'd have done in Python. And
> if I change my mind it marks the old run Out of date instead of pretending.

> What stops me trusting it fully: I can't check 0.795 against anything I know. I'd want the
> unweighted run next to it -- the 0.57 I remember -- and a rank-against-rank comparison, so I can
> say which characters move and why. Before a deck I'd still run
> `betweenness_centrality(G, weight='dist')` with dist = 1/value once in Python and check Valjean.
> Once it matches, I'd stop checking."

---

## Single Ease Question

**5 out of 7.**

> "Running it and answering the question was easy -- the answer was written on the option. The
> trust part took work: nothing on the run offered me an unweighted comparison, the picture didn't
> change, and I had to guess where a side-by-side lives. If the wrong answer had been my first
> click, I'm not sure I'd have noticed."

## Would he use this instead of his current tool?

> "For the Gephi half, yes, probably. It asks the weight question NetworkX never asks, it writes the
> formula on every run, and it keeps old runs instead of overwriting. That's already better than
> my current setup, where I'd pass `weight='value'` and get the backwards answer silently. For the
> numbers, not yet instead of Python -- alongside it, until I've matched it a few times. And I need
> the picture to show the thing I just ran, or I'm still screenshotting a table."

---

## Problems observed

1. **The wrong answer is the highlighted one when the menu opens (severity 2).** "a longer or
   costlier step" is highlighted by default in the answer list, so a keyboard user who presses
   Enter gets the reading that is wrong for count data without reading either option. Quote: "If I'd been
   tabbing through and hit Enter I'd have got 'longer or costlier step' without reading anything."
2. **A wrong reading still produces a believable ranking with no signal beyond one small line
   (severity 3).** The only clue in A4 is "Distance = value" under the run name, beside "shared
   scenes" in Statistics; nothing contrasts the two. Alex would catch it only if he read both and
   knew the data. Quote: "If I didn't know Les Mis, probably not."
3. **No unweighted comparison is offered from the run (severity 3).** An unweighted choice lives
   in the Weight field, but the form does not say so, and Alex did not open it. The number he
   trusts from memory (0.57) is unweighted, so he could not check the result. He found an
   unweighted column and "Compare rankings..." only on a different screen. Quote: "That's three
   things I discovered by looking at other screens."
4. **Two runs cannot be read side by side in the table (severity 2).** A6 lists both runs with
   their formulas, but the table shows only Run 2's column, so "who moved, and how far" needs two
   screenshots. Quote: "I'd be eyeballing two screenshots."
5. **Out of date numbers keep full contrast in the table (severity 2).** In A5 the old values stay
   in plain black; the only mark is a grey "Out of date" under the column header. Quote: "If someone
   screenshots at that moment, that's what goes in the deck."
6. **Running betweenness does not change the picture, and node size has no legend (severity 2).**
   Size stays on degree after the run, and only colour has a legend, so Alex assumed size showed
   the result and then realised it did not. Quote: "I'd assumed size meant betweenness after a run.
   It doesn't, I think it's still degree."

## What worked

- The load step asks nothing and says the question will come at run time; Alex found that sensible
  because he does not yet know which measure he will run.
- Run disabled with the reason "Choose what a bigger value means first" -- he accepted the extra
  click as the thing NetworkX should have made him do.
- The answer text "Distance = 1 / value, such as a count of shared scenes" matched his data and his
  own Python habit; he chose correctly on the first try.
- Every run row carries its conversion formula; "Re-run (keeps Run 1)" keeps an audit trail he can
  put in a deck.
- The unweighted rank column header ("Betweenness exact, unweighted, full graph") on the node table
  is exactly the labelling he wants on every result.
