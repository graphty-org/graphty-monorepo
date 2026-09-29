# Session: "who matters most, and how sure" -- Analyst Alex

**Participant:** Alex, operations data analyst (Python and NetworkX for the numbers, Gephi for the
picture). Simulated participant.
**Task as given by the moderator:** "Your manager wants the people who matter most in this
network, and how sure you are."
**Screens used:** the Results panel (starting screen), the Inspector, the main frame at rest.
Renders read from `shots/`; the page source was read only to see what a click would do.
Renders captured for this session: `shots/r3-who-matters-alex--finished-sampled.png`,
`shots/r3-who-matters-alex--in-the-table.png`.

**Outcome:** got a defensible top list with an honest "how sure" on the big patent graph, and a
side-by-side ranking table on the protein graph. Two contradictions on screen cost him trust.
**Ease (1 to 7):** 5.

---

## 1. First look: the Results panel with a run already going

*Screen: Patent citations project, PageRank running.*

> OK. "Patent citations", 124,318 nodes, 1.48 million edges. That's a real size. First thing I
> look at is top right -- nodes, edges. Fine, I don't have SQL numbers for this one, so I'll take
> them.
>
> Something's already running. "PageRank. Running on WebGPU, under a minute." There's a bar and a
> Cancel button. Good. That's actually the thing I care about -- I can see it's alive and I can
> kill it. In Gephi you just stare at it.
>
> Left rail, little text: "Assistant. Off. Nothing is sent." Huh. OK, I'll take that. I was going
> to ask.
>
> Then this box in the middle: "Options wait for Run." "Damping 0.5 has not run. Run queues it
> after this run." And above it "Values shown: run 1, damping 0.85." I didn't touch damping. Who
> set it to 0.5? Is what I'm going to see 0.85 or 0.5? I'd leave that alone and hope.
>
> Anyway. PageRank is fine, but when my manager says "who matters" what I actually defend is
> betweenness -- who everything routes through. Let me find betweenness.

He does not type into the search box; the catalogue is right there.

> Catalogue. Centrality. Betweenness -- "hours". Closeness "hours". Harmonic "hours". PageRank
> "under a minute". Oh, that's nice. It tells me before I click. Last time betweenness took me
> most of an afternoon on something a third this size. OK. I'm clicking it anyway, because
> that's the one I'd get asked about.

## 2. Clicking Betweenness: the refusal

*Screen: "Takes hours; exact runs stop at 30 seconds."*

> Red box. "Takes hours; exact runs stop at 30 seconds. Undirected, on the full graph: 124,318
> nodes." Right, so it won't even try. Honestly -- better than letting me start it and find out
> at two o'clock.
>
> Three options. "Fits the budget": "Sampled, 50 sources -- under a minute", and "Exact on Drug
> patent..." -- cut off. Drug patent what? Drug patents subset? How many nodes? That one might be
> the one I'd actually want, exact on something smaller I can name, and I can't read it. Then
> "Over the budget: Exact on the full graph, hours."
>
> "Budget" -- what budget? Is this costing money? Is there a quota? I'd guess it means time
> since it says 30 seconds up top, but "budget" makes me think of a bill.
>
> Also, bottom of the canvas: "124,318 nodes not drawn: more than this browser draws at once
> (50,000)." So... there's no picture. That's a problem later, my manager's going to want a
> picture. Park that.
>
> Fine. Sampled it is. NetworkX does the same thing with k and a seed, I've done that. "Run
> sampled."

## 3. The sampled result

*Screen: Betweenness (sampled), finished.*

> OK. "Sampled, 101 sources." Wait. It said 50 a second ago. I clicked the 50 one. Now it's 101?
> Sample size and seed boxes say 101 and 7. Did it change it on me or did I misread? That's the
> kind of thing I'd have to explain in a methods footnote and I don't know which number is true.
>
> Distribution: middle about zero, highest about 0.016, "zero ~79,554 nodes". Yeah, citation
> graphs, most things route nothing. Makes sense.
>
> Top nodes. Column header "rank, low-high". #1 5879702, about 0.0160. #2 5902311, about 0.0037.
> Then three rows all "#3-#7". And a line: "Ranks below #2 may swap between runs."
>
> OK -- that. That's the "how sure" my manager's asking for, in a sentence I can actually say.
> "The top two are solid, the next few are a tie band, we can't order them from a sample." I
> like that a lot. Nobody's ever given me that, I usually just rerun three times and eyeball it.
>
> #1 is four times #2. That's a real standout. That's a slide.
>
> But it's five rows. He asked for "the people who matter" -- in practice that's a top twenty.
> "124,313 more in the table." I'll need that.

He opens Details.

> Run record. Method: Brandes from 101 random sources, scaled up. Seed 7. Error bound plus or
> minus 0.00035, 95 runs out of 100. Good, that's a confidence interval, I can use that. There's
> a Copy button -- great, straight into the notes slide.
>
> Hang on. "Direction: citations read as undirected." "Normalization: divided by (n-1)(n-2)/2,
> the node pairs of an undirected graph." But the editor right next to it says "Unweighted,
> directed" and the Direction dropdown says "Directed". Which is it? This is exactly what I'd
> get wrong if I tried to match it in NetworkX -- directed and undirected normalise differently,
> the numbers come out off by a factor and then I look like an idiot. I would not put this number
> in a deck until I knew which one it ran.

## 4. The table

*Screen: the Nodes table under the canvas. The prototype switches to the Human protein
interactions project here (300 nodes) with exact betweenness and PageRank already run.*

> Different data now -- proteins, 300 nodes. OK, the prototype jumped. I'll pretend.
>
> Now this I like. The table opens under the picture, sorted by betweenness. Columns: degree,
> betweenness "exact, full graph", betweenness rank "of 300, ties share", PageRank, PageRank rank.
> MAPK1 #1 on both. TP53 #2 on both. YWHAZ #3 on both. UBC is #6 on betweenness but #10 on
> PageRank.
>
> That's the "most important according to what" question, answered on one row. Top five agree
> on both measures -- that's my confidence sentence for this one. Although I'm working that out
> myself by reading across. It doesn't say it. For the sampled one it said "ranks below #2 may
> swap"; here nothing tells me how much the two measures agree. I'd still do a quick rank
> correlation in Python to be able to say "they agree".
>
> "Export table as CSV..." top right. Good. Excel. Does it write the node table and not the edge
> table? It says Nodes tab is selected, so I'll trust it once and check the file.
>
> Degree has a column but no rank column. Minor, I can sort.
>
> And I never saw what this table looks like for the sampled patents -- do the ranks come out as
> ranges there too? I'd hope so. I can't tell from here.

## 5. The picture

*Screen: Betweenness finished on the protein graph, canvas painted.*

> Everything's orange-brown. Darker is more betweenness, log scale, legend says so. Honestly it
> looks like one colour to me -- I can pick out the dark ones in the middle but the rest is mush.
> The big nodes are the betweenness hubs, right? MAPK1, TP53...
>
> Oh -- no. Legend: "Degree size, degree". Size is degree, colour is betweenness. I'd have said
> "the big ones have the highest betweenness" to my manager. Half true, because here they mostly
> are the same nodes, but that's luck.

## 6. Inspector: defending one name

*Screen: TP53 selected.*

> I click TP53 because it's #2. Right panel: module DNA repair. Degree 32, "#2 of 300".
> Betweenness 0.1139, "#2 of 300". PageRank 0.01137, "#2 of 300". Oh that's nice. If my manager
> points at one dot and says "why that one", I have three numbers and three ranks on one card.
> "32 neighbors." Matches the degree. Good.
>
> Colours on this one -- light blue, amber, green, dark blue, vermilion, yellow, pink. I can tell
> them apart OK, actually. The amber and the orange-red are close but the legend has counts so
> I'll manage.

## 7. The main frame at rest

*Screen: Les Miserables sample, nothing selected.*

> Sample data. "This browser. Nothing sent." right under the project name, next to the file.
> That's where I want that line. Good. I'd still ask IT, but I'd bring a screenshot of this.
>
> Legend "Group color": 2, 8, 4, 1, 3, 5, 0, Other. Group 2 is first, so that's the main group,
> I guess. 77 nodes, 254 edges.
>
> For this task there's nothing here telling me where "who matters" lives -- I know it's the
> Results flask because I just came from there. If I'd started here I'd have looked for "Statistics"
> first, and that's only density and components. I'd have found Results on the rail eventually.

---

## After the task

**Single Ease Question: 5 out of 7.**

> What took longest: sorting out whether the betweenness I got was directed or undirected, and
> whether it was 50 or 101 sources. The actual getting-a-ranking part was quick -- quicker than
> Gephi, and it told me up front it would take hours instead of letting me find out.

**Would you use this instead of what you use now?**

> For the picture-plus-table half, maybe, yes. The ranks "of 300" next to each other and the
> "#3-#7, may swap between runs" line are better than anything I get out of Gephi -- that's the
> sentence my manager actually wants. The run record with the seed I can paste into a methods
> slide.
>
> But two things. One, it said directed in one place and undirected in the other, and the sample
> size changed between clicking and finishing. If I can't match its number in NetworkX I'm not
> using it, and right now I don't know what I'd be matching against. Two, on the big graph it
> doesn't draw anything, so I'd still be making the picture somewhere else, which is the half I
> wanted to stop doing.
>
> I'd try it on next month's supplier file, if the numbers match NetworkX.

---

## Problems observed

| Screen | What happened | Severity (1 to 4) |
|---|---|---|
| Results panel, sampled betweenness finished | The editor says "Unweighted, directed" and Direction reads "Directed", while the run record says "Citations read as undirected" and normalises by undirected node pairs. He cannot tell which was run, so he cannot match it in NetworkX. | 3 |
| Results panel, refusal then finished result | The refusal offers "Sampled, 50 sources"; the finished result reads "Sampled, 101 sources". He believes the tool changed his choice. (The page source says 101 in both places; the refusal and not-run renders are older than the page.) | 2 |
| Results panel, refusal | The exact-on-a-subset route is cut off at "Exact on Drug patent..."; its size and name, the reason to choose it, are not readable. | 2 |
| Results panel, refusal | "Fits the budget" / "Over the budget" reads as money or a quota, not time. (The page source now says "time limit"; the render still says "budget".) | 1 |
| Results panel, refusal and finished on the patent graph | Nothing is drawn past 50,000 nodes; "Narrow the graph..." does not say which narrowing would give him a slide. His manager wants a picture. | 2 |
| Results panel, sampled result | Top nodes shows five rows; his job is a top twenty. How the table shows sampled ranks (as ranges or not) is not visible to him. | 2 |
| Results panel, Nodes table (exact runs) | Nothing states how far betweenness and PageRank agree; he reads the agreement across rows himself and would still compute a rank correlation in Python. | 2 |
| Results panel, finished protein graph | Colour is betweenness and size is degree; he first called the big nodes "the betweenness hubs". The single orange-brown ramp reads as one colour to him. | 2 |
| Results panel, running PageRank | "Damping 0.5 has not run" and "Values shown: run 1, damping 0.85" appear though he changed nothing; he does not know which value the result will show. | 1 |
| Main frame at rest | Nothing points from the resting frame to where rankings live; he would look under Statistics first. | 1 |

## What worked for him

- Time bands in the catalogue ("hours", "under a minute") before any click.
- A refusal with cheaper routes instead of a run that never comes back.
- "rank, low-high" with "#3-#7" and "Ranks below #2 may swap between runs": a sentence he can say
  to a director.
- The run record with the seed, the error bound and a Copy button.
- The Nodes table with each measure's value and rank "of 300" side by side, and CSV export.
- The Inspector card with value and rank for each measure on one node.
- "Nothing is sent" on the rail and "This browser. Nothing sent." beside the file.
