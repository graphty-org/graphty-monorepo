# Who matters most, and how sure -- session with Explorer Elena

**Participant.** Explorer Elena, a product manager with no graph training (simulated; see
`study/personas/explorer-elena.md`). Variant: curious afternoon (long clock, tolerates three or
four dead ends).

**Task as given by the moderator.** "Your manager wants the people who matter most in this
network, and how sure you are."

**Screens, in the order she met them.** The Results panel (its first state, then the states she
reached by clicking), the Inspector with one protein selected, and the frame at rest.

**Outcome.** She produced a top-five list and a sentence for her manager, but the "how sure" half
of the sentence rests on a misreading: she took the word "Exact" to mean "the ranking is certain".
Single Ease Question: 2 of 7.

---

## Transcript

### 1. The Results panel, first look

> OK. Results. That sounds like where the answer would be. ... It's a big white space in the
> middle. There's no picture. Is it still loading?

She reads the box at the bottom of the canvas.

> "124,318 nodes not drawn: more than this browser draws at once." ... So it didn't draw my
> network because it's too big? Or I don't have enough computer? Hmm. My laptop is not great.

She blames her laptop, not the tool, and moves on.

> There's a box open in the middle -- "PageRank". There's a blue bar going across, "Running on
> WebGPU, under a minute". I didn't start anything. Did I start that? ... Something's running. I
> guess I'll let it run.

She looks at the fields in the box: Scope, Direction, Weight, Damping.

> Damping. OK. I'm not touching that. There's a "0.5" and it says "Damping 0.5 has not run. Run
> queues it after this run." I don't know what I changed. Maybe someone before me changed it. I'll
> leave it.

(Moderator note: she did not change anything; the state she landed in shows a held edit. She read
it as a change she had made by accident and got slightly anxious.)

### 2. The list on the left

> There's a "Catalog" on the left. Centrality, Betweenness, Closeness, Eigenvector, Harmonic
> centrality, HITS, Katz, PageRank. ... These are all words. I don't know any of these words.
> "Centrality" -- central -- in the middle? The people in the middle? That's probably the section.

> But which one? There's eight of them. Betweenness says "hours". Closeness says "hours". HITS is
> "under a minute". Katz is "under a minute". Is Katz a person?

She laughs.

> "Over a day" for Girvan-Newman. Over a day! No. I'm not clicking anything that says hours.

> Honestly I just want it to pick one. The thing that says "who's most important". There isn't
> one called that.

She searches: she clicks into "Find a result or algorithm" and types "important". (The mock does
not answer; in a working prototype she would expect a suggestion. She shrugs.)

> Nothing. OK. "Influence"? ... No. Fine. PageRank. That's the Google thing, right? Google ranks
> pages by who links to them. So it's like a popularity thing. That's already running anyway.

### 3. A dead end: the cost message

Following the moderator's "go ahead and click around", she clicks Betweenness in the Catalog,
because it was the first word under Centrality.

> Oh, red. "Takes hours; exact runs stop at 30 seconds." So it... stopped? It failed? And then it
> says "Fits the budget" -- budget! Is this going to cost money? Is there a bill?

> "Sampled, 50 sources, under a minute." "Exact on Drug patents granted in 2001." I don't know what
> a source is. I have a hundred thousand of these things and it wants to use fifty? That sounds
> like it'd be wrong.

She reads the prototype label strip above the canvas, which says "Refused by the cost gate".

> "Refused by the cost gate". Yeah, it's a money thing. I'm going to close this.

She closes the box (the X) without running anything. Dead end one.

### 4. The finished answer

The moderator moves her to a smaller network that already has an answer ("Human protein
interactions", 300 dots), with Betweenness finished.

> OK! There's a picture. Ooh. That's nice, those little bunches. They're all orange and brown.

> The dark ones are the important ones? There's MAPK1, TP53, AKT1, UBB... they're in the middle
> and they're big and dark. So the ones in the middle are the most important. That makes sense.

(Misreading: she took position in the middle as importance. Size is degree and color is
betweenness; the legend at the bottom right says so, but she did not read it until later.)

> The box has a little chart -- "Distribution, 300 nodes". Grey bars. 0, 0.069, 0.138. I have no
> idea what I'm looking at. "Bar height: square root of the count". Nope. "Middle 0.0038, highest
> 0.138, zero 10 nodes." Is 0.138 good? Out of what? One?

She almost stops here. Then she scrolls the box.

> Oh, wait -- "Top nodes". There's a list. 1 MAPK1, 2 TP53, 3 YWHAZ, 4 CDK1, 5 AKT1. OK, THAT is
> what I wanted. Why is it under the weird chart? It was cut off, I nearly missed it.

> "295 more in the table." What table? I haven't seen a table.

She does not look for the table.

### 5. "How sure"

> OK, so, how sure am I. ... There's a line at the top of the box: "Exact. Unweighted,
> undirected. WebGPU." Exact! OK, great, so it's not a guess. It's exact. So I'm sure.

> Unweighted I don't know. WebGPU I don't know. But "exact" -- I can tell my manager it's exact.

She clicks "Details" next to it. Nothing opens in the mock.

> Nothing. OK. I'll take "exact".

(Moderator note: "Exact" describes the computation, not how firm the ranking is. Numbers four
and five, CDK1 0.0687 and AKT1 0.0642, are close enough that a small change in the data could
swap them; YWHAZ at 0.0695 is barely ahead of CDK1. Nothing on the screen says whether a gap
matters, and she did not look at the gaps. She would have said the same "exact, so it's solid" if
the top five were all within a hair of each other.)

> Is it the same if I use the other one, the Google one? I don't want to run another thing that
> takes hours, though.

### 6. The Inspector

The moderator moves her to the Inspector with TP53 selected.

> Oh, this I like. TP53, on the right. "Degree 32, number 2 of 300." "Betweenness 0.1139, number 2
> of 300." "Pagerank 0.01137, number 2 of 300."

> Number two of three hundred, three times. OK, so it's not a fluke. Three different ways of
> scoring it and it's second every time. THAT I can tell my manager. "It's in the top two no
> matter how you measure it."

> I don't know what degree is but "number two of three hundred" I get. Why doesn't the other box
> say that? The other one just says 0.138.

> "2 more" -- two more what? Two more scores? I'd click it.

> Connections, "Neighbors 32". So it's connected to 32 things. That's a lot? It's number two, so
> yes, a lot, I guess.

She tries to get the same "#2 of 300" for MAPK1 and the others, and realises she would have to
click each one in the picture one by one.

> Do I have to click every dot? I want this, but for the top five, side by side.

### 7. The frame at rest

The moderator shows her the Les Miserables network at rest, and asks where she would start if
this were her data.

> The big yellow one in the middle, Valjean. He's the main guy. The size legend at the bottom says
> "Size by degree, 1, 10, 36." So the biggest has 36. OK. So he's the most important.

> The colors are groups? "Group color: 2, 8, 4, 1, 3, 5, 0, Other." Group 2. Group 8. What's
> group 8? Are those ranks? Is group 0 the best? Or the worst?

(Misreading: she briefly took the group numbers as a ranking. They are arbitrary group ids from
the file.)

> On the right, "Statistics": nodes 77, edges 254, density 0.0868. Nodes, I know now, that's the
> dots. Density... is that a lot? I'll skip that. There's nothing here that says who's important.
> I'd go back to Results. And I'd pick... the Google one, probably.

### 8. Wrapping up

> What I'd send my manager: "The top five are MAPK1, TP53, YWHAZ, CDK1 and AKT1. TP53 is second
> on every measure. The numbers are exact." And I'd paste the list, because the picture is too
> busy for a slide.

> Would I be comfortable if he asks "exact meaning what"? No. I'd say "the tool said exact". And if
> he asks "why betweenness and not the other ones", I'd have nothing.

---

## Single Ease Question

**2 of 7.** "Getting the list was OK once somebody gave me one that was already done. Finding which
one to run, I'd never have done on my own. And the 'how sure' part, I'm honestly guessing."

## Would she use this instead of her current tool?

"My current tool is a spreadsheet, sorted by who has the most rows. Honestly for 'who matters' I'd
probably still do that, and then show this picture as a nice slide. If it opened with the top five
and said, in words, 'these five matter most, and here's how sure we are', like the '#2 of 300'
thing, then yes, I'd use it, because the picture is kind of mesmerising and my sheet doesn't show
the groups. But I'm not going to pick between eight words I don't know, and I'm not clicking
anything that says 'hours'."

---

## Problems observed

| Screen | What happened | Severity (1-4) |
|---|---|---|
| Results panel, finished | Nothing tells her how firm the ranking is. She read "Exact" as "certain" and would repeat that to her manager; close scores (0.0695, 0.0687, 0.0642) carry no warning or plain statement of confidence. "Details" did nothing. | 4 |
| Results panel, Catalog | The only way to ask "who matters" is to pick among eight centrality names (Betweenness, Closeness, Eigenvector, Harmonic, HITS, Katz, PageRank...). No plain-language entry; search for "important" finds nothing. She guessed PageRank because of Google. | 4 |
| Results panel, finished | Top nodes list sits below the distribution chart and was cut off at the panel edge; she nearly quit at the chart of unexplained numbers before finding it. | 3 |
| Results panel, finished | Scores shown as bare decimals (0.138, 0.0038) with no scale; the Inspector's "#2 of 300" ranks are what she understood, and they are missing from the Results panel list. | 3 |
| Results panel, cost refusal | "Takes hours", "over a day", "budget" and the label "cost gate" read as money and as failure; "Sampled, 50 sources" out of 124,318 sounded like it would be wrong. She closed it without running anything. | 3 |
| Results panel, first state | Opened on a blank canvas with a run already going and a held option edit she did not make; the "not drawn" box made her blame her laptop. | 2 |
| Results panel, finished | "295 more in the table" -- she had never seen a table and did not go looking. | 2 |
| Inspector | "#2 of 300" on three measures is what gave her real confidence, but she has to click each dot one by one to compare the top five. | 2 |
| Frame at rest | Group legend labels are bare numbers (2, 8, 4, 0); she took them as a ranking. She took the dot in the middle as the most important. | 2 |
