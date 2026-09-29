# Who matters most, and how sure -- Explorer Elena

**Participant:** Explorer Elena, a product manager with no graph training (simulated; see
`study/personas/explorer-elena.md`). Long-clock variant: no deadline, curious, tolerates three or
four dead ends.

**Task as read by the moderator:** "Your manager wants the people who matter most in this
network, and how sure you are."

**Screens, in order:** the results panel (several of its states, which the moderator stepped
through as if the app had moved on), the inspector with one protein selected, and the app at rest
with a small network open. The pink bar across the top of each mock was covered by the moderator
and is not part of the product.

**Outcome:** finished with difficulty. She produced a Slack sentence, but she picked the measure
by accident (it was already in the list) and her "how sure" leaned on the word "Exact", which she
half-misread.

## Transcript

### 1. The results panel, while something is running (patent network)

> OK. "Patent citations." That's not really people, but fine, I'll pretend. There's a lot going
> on. Left side has a list... "In this project", "Catalog". Middle is empty? Where's the picture?

She looks at the empty grey middle for a while.

> Is it still loading? There's a blue bar next to PageRank -- "Running on WebGPU, under a
> minute." I don't know what WebGPU is. I'll wait, I guess.

She reads the Catalog column top to bottom.

> Betweenness, Closeness, Eigenvector, Harmonic centrality, HITS, Katz... these are all names.
> Like, of people? Katz sounds like a person. None of these says "important" or "top". And some
> of them say "hours" and one says "over a day". Is that how long it takes? On my laptop? No.

She clicks into "Find a result or algorithm" and types.

> "important"... nothing. "top"... nothing. "rank"? OK. I'm going to guess. I've heard of
> PageRank, that's the Google thing, it ranks pages, so it ranks... dots. And it says "under a
> minute", which I like better than "hours".

She notices the popout for PageRank on the right of the list.

> Damping 0.5? "Damping 0.5 has not run." I didn't touch that. Did I change something? I'm not
> touching Reset.

### 2. Finished (the moderator moves to the protein network)

> Wait, now it's "Human protein interactions". Different data? Fine. Oh -- now there's a picture.
> Ooh, OK, that's kind of nice, lots of little orange clusters.

> It says Betweenness is selected, not PageRank. Did it switch? Whatever, it finished, so I'll
> read this one.

She looks at the canvas first.

> So the big dark ones in the middle -- MAPK1, TP53, HSP90AA1 -- those are the important ones.
> That's easy, big and in the middle. MAPK1 is the boss.

(The size is the number of connections, from a separate style; the colour is betweenness. The
legend in the lower right says "Degree size". She did not read it.)

> Everything's kind of the same orange though. The legend says 0, 0.001, 0.01, 0.1. Is 0.1 good?
> Is that out of 1? It's all orange-brown to me.

She reads the panel.

> "on: full graph, 300 nodes, 3 components. Exact. Unweighted, undirected." OK, "Exact" -- good,
> that's the "how sure" part, right? It's exact. There's a little box: "Computed on every node,
> not estimated." Great. "It does not say the ranking is meaningful." ...What? Then what does?
> Why would you tell me that and then not tell me what to do about it?

> Distribution. Bars. "bar height: square root of the count" -- skipping that. "middle 0.0038,
> highest 0.138, zero 10 nodes." So... the answer is 0.138? Of what?

She almost stops here, thinking the distribution numbers are the result. Then she scrolls the
panel by accident with the trackpad.

> Oh, there's more. "Top nodes." 1 MAPK1 0.1379, 2 TP53 0.1139, 3 YWHAZ, 4 CDK1, 5 AKT1. OK! That's
> a list. That's what I wanted. Why was it at the bottom?

> "No near-ties in the top 5: the closest, ranks 3 and 4, differ by 1.2%." OK, so it's not a coin
> flip between them. I like that. That's a sentence I could say out loud. Is 1.2% a lot? It says
> "no near-ties", so I guess 1.2% is enough.

### 3. The table, "295 more in the table"

> I'll click "295 more in the table" -- it's a link, it says where it goes.

> Now there's a spreadsheet. Good, I understand spreadsheets. Betweenness rank, PageRank rank...
> UBC is #6 in one and #10 in the other. So which one is it? My manager wants one list. Which
> column is "matters most"? Nothing here tells me. I guess I'll use the first one, since it's
> the one it sorted by.

> "#1 of 300" -- oh wait, the header says "rank of 300". That I get.

### 4. The sampled run (patent network again)

> Back to the patents. No picture again -- "124,318 nodes not drawn: more than this browser draws
> at once." So there IS no picture. Hm. "Narrow the graph..." I don't know what I'd narrow it to.

> Top nodes: "#1 5879702". These are numbers, not names. I'd have to look those up. "#3-#7" for
> three of them. Oh, so it's not sure which one is 3rd -- could be anywhere from 3rd to 7th.
> "Ranks below #2 may swap between runs." OK, that's honest. That's actually the answer to "how
> sure": sure about the top two, not the rest. I'd say that.

> "Sampled, 101 sources." Don't know what a source is. Details... "Error bound plus or minus
> 0.00035, 95 runs out of 100." I'm not reading that part. The "#3-#7" told me enough.

### 5. The inspector, TP53 selected

> I clicked TP53, the one from the list. Right side changed. "degree 32, #2 of 300.
> betweenness 0.1139, #2 of 300. pagerank 0.01137, #2 of 300." OK, #2 on everything. That's
> clear. I don't know what the numbers mean, but #2 of 300 I understand. Why doesn't the Top
> nodes list say "of 300" too?

> "Neighbors" -- the little popup says "Filter to neighbors, 1 hop: 33 nodes. Ctrl+Z undoes it."
> Oh nice, it tells me I can undo. I'd actually press that.

> Does #2 mean it matters, though? The earlier box said it doesn't say the ranking is meaningful.
> So I don't know.

### 6. The app at rest (Les Miserables)

The moderator asked her to start over on this screen as if she had just opened the file.

> Characters from Les Mis -- OK, these are actually people. Valjean in the middle. He's the most
> important, obviously, he's in the middle with the most lines.

She clicks Valjean, then looks at the right side.

> Statistics: Nodes 77, Edges 254, Density 0.0868, Degree distribution. That's about the whole
> thing, not who matters. Where's the list of top people? The colours are groups, 2, 8, 4, 1...
> the numbers don't mean anything to me.

She scans the right panel again, then the canvas toolbar.

> Is it in the lightning bolt? ... Not sure.

Moderator: "Is there anywhere else you'd look?"

> Oh -- "Results" on the left edge, with the little flask. I thought that was a logo. OK. That's
> where the list was. It's not obvious that "Results" is where you go for "who matters".

## What she would post

> "Top two in the protein network are MAPK1 and TP53, clearly ahead of the rest (exact numbers,
> nothing close to a tie in the top 5). For the patents it's only sure about the top two; 3 to 7
> could swap."

> But honestly if my manager asks "why betweenness?" I have no answer. It was just the one that
> was already there.

## Single Ease Question

**3 of 7.** "Once I found Top nodes it was fine, and the tie sentence and the #3-#7 thing were
really good. But I had to guess what to run, I didn't know which of the two scores to trust, and
the list was hidden under a chart."

## Would she use it instead of her current tool?

> "My current tool is a spreadsheet and a pivot table, so, maybe? The '#2 of 300' and 'ranks
> below #2 may swap' bits are better than anything I'd get in Sheets. But I'd need it to pick the
> measure for me, or at least tell me which one means 'who matters'. Right now I'd have to ask a
> data person which one to click, and then I'd just ask them for the list."
