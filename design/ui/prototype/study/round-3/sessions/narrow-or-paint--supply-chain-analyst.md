# Session: narrow to the biggest piece -- Dana Okafor, supply chain risk analyst

Participant: Dana Okafor (composite persona; see ../../personas/supply-chain-analyst.md).
Screens, in the order she met them: the filter chip screen, the frame at rest, the Results panel.
Data on screen: the Les Miserables co-appearance graph (77 characters, 254 links) -- not her
supplier data; she was told to treat the characters as "suppliers" if it helped.

Moderator's task, read once: "Look only at the biggest connected piece, and tell me its size and
who matters most in it."

## Transcript (think-aloud)

**Filter chip screen, as it opens.**

"OK. Les Miserables. Fine, it's a demo. 'Biggest connected piece.' I'm looking for something that
says 'group' or 'cluster'... there's a Statistics box on the right, that's where I'd go. 'largest
component: 27.' Component. I don't say component, but 'largest' is close enough. So the answer is
27?"

"And who matters most -- the table at the bottom is sorted by 'degree', Valjean 17 at the top. I
don't know what degree is. Temperature? No. Probably how many things he's linked to."

"Wait. Why does the box on the left say '27 of 77 nodes, 3 steps'? I didn't do three steps. And
there's a little filter icon next to every number on the right. Somebody already filtered this.
That's exactly the thing I hate -- I nearly walked out with 27 and it's somebody else's cut of
the data. If my VP asked 'is that all of it', I'd have been wrong."

"There's a panel open, 'Filter steps': 'degree >= 2', 'degree >= 5', 'Filter out group 8'. I
don't want any of that. I'll untick all three."

(She unticks the three boxes. The chip goes back to all 77; Statistics now read components 1,
largest component 77.)

"Components: 1. So... it's all one piece? Then the biggest piece is the whole thing, 77. That
feels too easy. Let me do it properly, there's 'Add step'."

**Add step menu.**

"'Filter to: Largest component, k-core..., Rule...'. k-core, no idea, not touching that.
'Largest component' -- that's the one."

(She clicks Largest component. A row appears: "Filter to Largest component -- took out 0 -- 77
left". The chip says "Filtered: 77 of 77 nodes - 1 step".)

"'Took out 0.' So it did nothing? Did it work? I'd want one line that says 'the whole graph is
already one piece' instead of making me work out that zero means that. And that grey line is
tiny -- I had to lean in. On my laptop I would not read it."

"Now the table has two degree columns: 'degree' and 'degree on: full graph', and they're the
same numbers. Why are there two? Fine -- because I filtered, I suppose. They're identical, so
it doesn't matter today."

"Who matters most: Valjean, 36. Then Gavroche 22, Marius 19, Javert 17. Big orange dot in the
middle is Valjean too, and the left panel says 'Size by degree', so the big dots are the
high-degree ones. OK, degree is 'number of connections'. Nobody told me that, I'm guessing from
the dot sizes."

**Frame at rest (the same graph, nothing filtered).**

"Here it says 'Connected components 1' and '77 nodes'. Same answer, good, the numbers agree. The
little (i) next to it, I don't hover things. 'This browser. Nothing sent.' -- that I noticed.
That's the first thing IT asks me."

**Results panel.**

"'Most connected' isn't the same as 'matters most'. In my world the one that matters is the
chokepoint -- the one everything flows through. A vendor webinar called that betweenness. There
it is under Centrality: Betweenness. I'll open that."

"Top nodes: Valjean 0.419, Gavroche 0.172, Marius 0.164, Fantine 0.154, Javert 0.073. OK,
Valjean again, by a mile. That I like: a ranked list, and 'no near-ties in the top 5', so the
order isn't a coin flip. What's 0.419 though? 0.419 of what? I can't put 0.419 on a slide."

"Hang on -- up top it says 'Filtered: 60 of 77 nodes, 1 step' and 'on: filtered graph, 60
nodes'. I just had 77. Where did 60 come from? The 'Details' box says 'after Filter to degree >=
2'. I didn't set that here. So these betweenness numbers are on a different cut than my 77.
Numbers that change on me is when I stop trusting the tool."

"And the Details box: 'Brandes betweenness, exact', 'Divided by (n-1)(n-2)/2'. That's for someone
else. I skip it."

**Her answer to the moderator.**

"The biggest piece is the whole thing -- 77, everything is connected to everything else. The one
that matters most is Valjean: most connections, 36, and top of the betweenness list. I'm fairly
sure about the 77. I'm sure about Valjean because both lists agree, not because I understand
either number."

## After the task

**Single Ease Question:** 4 of 7.

"Getting the answer took a minute. Trusting it took longer. First thing I saw was somebody else's
filter giving me 27, and I'd have said 27 if I hadn't spotted the '3 steps'. Then 'took out 0'
without saying why, then a betweenness list that was on 60 nodes, not my 77."

**Would she use this instead of her current tool?**

"Not instead. Maybe beside. The 'largest piece' button is actually something I can't do in Excel
in ten minutes -- that's a real thing, finding which suppliers are hooked together and which are
floating on their own. And the ranked list with a 'why it's not a tie' line is the right shape.
But I need 'most connected' and 'chokepoint' in words, not 'degree' and 0.419, and I need to get
that list out into Power BI or at least a CSV. And the same question from my side: on my data,
most suppliers only link to us -- with Tier 1 only, is my 'biggest piece' just everybody hanging
off one hub? Where do I get the Tier 2 links from? Nothing on these screens answers that."

## Problems seen

| Screen | What happened | Severity (1-4) |
| --- | --- | --- |
| Filter chip | Opens with three filter steps already on; Statistics read "largest component 27" and the table tops at Valjean 17. She nearly answered 27; only the "3 steps" in the chip saved her. The funnel marks on each number are too small to register as "this is filtered". | 3 |
| Results panel | The Betweenness result is on "Filtered graph, 60 of 77" after a step she never made; the scope differs from the 77 she had just set, so the ranking reads as numbers that changed on their own. | 3 |
| Results panel / filter chip | "Who matters most" has no plain answer: "degree" is unexplained (she inferred it from dot sizes) and betweenness is a bare 0.419 with no unit or meaning; she could not put either number on a slide. | 3 |
| Filter chip | "Filter to Largest component -- took out 0 -- 77 left" with no sentence that the graph is already one piece; she wondered whether the step worked. | 2 |
| Filter chip | Menu and statistics use "component", "k-core", "degree" with no plain-words gloss; "largest" was the only word that let her guess right. | 2 |
| Filter chip / Results panel | Small grey secondary text ("took out 0 - 77 left", scope lines, run record) is hard to read at her eyesight and on a 14-inch laptop. | 2 |
| Filter chip | Two degree columns ("degree" and "degree on: full graph") with identical values after a step that removed nothing; she did not know why there were two. | 1 |
| Results panel | Run record wording ("Brandes", "(n-1)(n-2)/2", "WebGPU") -- she skipped it; harmless because it is behind "Details". | 1 |

## What worked for her

- "Largest component" as a one-click filter step, and the chip counting "77 of 77 - 1 step" so the
  scope is always visible.
- Statistics and the frame at rest agreeing (1 piece, 77) -- the same number in two places.
- The Top nodes list with the line saying there are no near-ties in the top 5.
- "This browser. Nothing sent." in the corner -- answers her first IT question without asking.
