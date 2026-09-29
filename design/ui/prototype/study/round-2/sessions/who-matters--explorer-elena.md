# Who matters, and how sure -- a session with Explorer Elena

**Participant.** Explorer Elena, a product manager with no graph training (simulated; persona in
`study/personas/explorer-elena.md`). Short-clock variant: her manager asked, so she wants one
sentence and a screenshot, not an afternoon.

**Task, as the moderator gave it.** "Your manager wants the people who matter most in this
network, and how sure you are."

**Screens.** The Results panel mock (several of its states), the Inspector mock (one protein
selected), and the resting frame (Les Miserables). The pink strip across the top of each mock is
the study's own navigation; the moderator told her to ignore it and moved between states for her
when her click would have led there.

**Outcome.** Partly done. She named the top two (MAPK1 and TP53) and would paste the table. She
could not say how sure she was. The only confidence words she met were "Exact", which she first
read as "certain" and then as "the tool won't vouch for it", and "Ranks below #2 may swap between
runs", which she liked -- but it only appeared on the big patent graph, not on the one she was
reporting. Single Ease Question: 3 of 7.

## Transcript

Elena's words are in quotes. Moderator notes are in brackets.

### 1. Landing on the Results panel (patent citations, PageRank running)

"OK. Patent citations. So this is... not people. Fine, 'people who matter' -- the dots that
matter."

[Looks at the middle of the screen first. The canvas is empty grey.]

"Where's the picture? It's blank." [Scans down to the box in the bottom right.] "'124,318 nodes
not drawn: more than this browser draws at once.' Oh. So it's too big to show me. Well, I
probably picked the wrong thing." [Blames herself; she did not pick anything.]

[Looks at the floating card: PageRank, a blue bar, "Running on WebGPU, under a minute".]

"Something's already running. PageRank -- that's the Google thing, right? Websites that get
linked to a lot. I guess that's who matters? I didn't start it though." [Reads "Damping 0.5 has
not run. Run queues it after this run."] "I don't know what damping is and I'm not touching it."

[Moves to the left list, the Catalog.]

"Centrality. Betweenness -- hours. Closeness -- hours. Eigenvector, HITS, Katz... these are all
names. Which one of these is 'who matters'? Centrality sounds like 'who's in the middle', so
it's one of these. Betweenness says hours. I'm not waiting hours for my manager. I'll let the
PageRank one finish."

[Engagement check: she is still trying, but she has not chosen a measure; she accepted the one
that was already running.]

### 2. A result she can see (human protein interactions, Betweenness finished)

[The moderator moves her to the finished Betweenness result on the 300-protein graph, since the
patent graph cannot be drawn.]

"Ooh, OK, now there's a picture. That's nicer." [Brief charm.] "The big dark ones in the middle
have names. MAPK1, TP53, AKT1, MYC. So the big ones in the middle are the ones that matter."

[She is reading dot size as importance. In this mock the colour is betweenness and the size is
degree (connection count); the legend in the bottom right says so. She did not read the legend.
Here the two happen to agree, so her conclusion is roughly right for the wrong reason.]

"And there's a 'Top nodes' list. 1 MAPK1 0.1379, 2 TP53 0.1139, 3 YWHAZ, 4 CDK1. That's it,
that's what I need. MAPK1 is number one."

"What's 0.1379? Is that a lot? Out of what -- out of 1? So it's like 14 percent?" [Guessing.]
"Middle 0.0038, highest 0.138. So the top one is way above the middle. OK, I'll take that as
'it's a lot'."

[Skips the distribution chart and its caption "bar height: square root of the count".]

### 3. Looking for "how sure"

"Now 'how sure'. Hmm." [Scans the card.] "'Exact.' Great -- it's exact. So I'm sure. Done."

[Hovers the small circled i next to Exact because it is the only thing near the word.]

"'Computed on every node, not estimated. It does not say the ranking is meaningful.' ...Wait.
So it's exact but it might not mean anything? Then how sure am I? That's literally the question
my manager asked and it just told me it's not answering it."

"Is there a 'confidence' thing somewhere? A percentage?" [Looks at the right-hand column:
nodes 300, edges 1,262, components 3, average degree 8.41.] "No. Those are just counts."

[Clicks "Details" next to WebGPU.] [In the sampled state this opens a Run record.] "Brandes
betweenness from 50 random sources, scaled up by... normalization divided by (n-1)(n-2)/2..."
[Closes it.] "No. That's for a data scientist."

### 4. The sampled result on the patent graph

[Moderator moves her to the finished sampled Betweenness on the patent graph.]

"This one has squiggles -- '~0.0160'. And '#3 to #7'. Oh, and here: 'Ranks below #2 may swap
between runs.' OK! That's a sentence I can say. The top two are solid, the next few could
shuffle."

"But these are numbers -- 5879702, 5902311. I don't know what patent that is. And why does the
big one get the careful sentence and the small one just says 'Exact'? Is the protein one solid
all the way down, then? I guess so?" [Unsure; she does not trust her guess.]

"'Error bound plus or minus 0.00035 on each value, 95 runs out of 100.' So... 95 percent sure?
I'd say that to my manager and hope nobody asks a follow-up."

### 5. The table (protein graph, "295 more in the table")

[She did not find the "more in the table" link on her own on the protein graph; the Top nodes
list was cut off after 4 and she scrolled the card first. The moderator pointed at the link.]

"Oh, a table. Now we're talking. 'MAPK1, degree 34, betweenness 0.1379, #1 of 300.' '#1 of 300'
-- that I can put on a slide. And 'Export table as CSV'. Good, I can make my own chart in Slides."

"Module -- MAPK signaling, DNA repair, Unassigned... Lots of Unassigned. Did I lose something?
Probably the file just doesn't have it." [Self-blame again.]

"'ties share' under the rank column. Ties? Are there ties at the top? No, they all look
different. Whatever."

### 6. Inspector -- clicking the one she has heard of

"Everyone's heard of TP53, it's the cancer one. Let me click it." [Inspector: TP53.]

"Betweenness 0.113, #2 of 300. Pagerank 0.0113, #2 of 300. Degree 32, #2. Oh -- it's number two
on all of them. That makes me feel better, actually. If three different ways agree, I'm more
sure."

[This is the only point where she built a sense of confidence, and she built it herself by
reading three rows in the Inspector. No screen told her the measures agree.]

"Is there a way to just see if the lists agree for everyone? ... 'Compare with...' -- oh. It was
right there in the card. I don't know what it compares with, though. With another result? Which
one?" [Does not click it; unsure what it would change.]

### 7. The resting frame (Les Miserables)

"This one's the book characters. Valjean is huge and in the middle, so he's the one who
matters." [Size by degree; she read "Size by degree" in the legend but does not know the word
"degree".] "'Size by degree' -- degree like... how important? Sure."

"Density 0.0868. Connected components 2 (1 isolate). I don't know what I'd do with that. Where
do I get a ranking here? Oh, Results on the left, I guess, like before."

[Answers shorten here: "yeah", "OK". Engagement dropping.]

## After the task

**What she would send her manager.** "MAPK1 and TP53 are the two most central proteins -- #1 and
#2 of 300 on betweenness, and TP53 is #2 on the other measures too. How sure: the tool says
'exact', but I'm not totally sure what that promises." She would attach the CSV, not a picture.

**Single Ease Question.** 3 of 7. "The who part was OK once I had the list. The how-sure part I
basically made up."

**Would she use this instead of what she has?** "What I have is nothing -- a spreadsheet and a
pivot table of who shows up most. This beats that, because the list and the '#1 of 300' is
something I can show. But I had to pick from ten words I don't know, and when I asked how sure,
the one note it gave me said it wasn't saying. If it just told me 'these top ones are solid,
these could swap', in plain words, on every result, I'd use it. Right now I'd use it for the
table and then go ask Priya in data science if I can trust it."

## Problems seen

1. **No plain door to "who matters".** The Catalog lists Betweenness, Closeness, Eigenvector,
   Harmonic centrality, HITS, Katz, PageRank. She could not tell which answers her question and
   defaulted to whatever was already running. Severity 3.
2. **"Exact" is misread, then its tooltip undermines trust.** She read "Exact" as "certain"; the
   tooltip "It does not say the ranking is meaningful" turned it into "the tool won't vouch for
   it". An exact result gives her no statement of how stable the top of the ranking is. Severity 3.
3. **The one plain confidence sentence appears only on sampled results.** "Ranks below #2 may
   swap between runs" was the best moment of the session, but only on the patent graph, whose
   top list shows patent numbers instead of names. On the exact result she had nothing
   comparable. Severity 3.
4. **Scores with no scale.** 0.1379, 0.0038, 0.0113 -- she guessed "14 percent". The "#1 of 300"
   in the table and Inspector was what she actually understood. Severity 2.
5. **Size and colour mean different things; she read size as importance.** Colour was
   betweenness, size was degree; she did not read the legend and concluded "the big ones matter".
   Correct here by coincidence. "Size by degree" did not help: she does not know "degree".
   Severity 2.
6. **Agreement between measures had to be discovered by hand.** Confidence came from TP53 being
   #2 on three rows in the Inspector. "Compare with..." was noticed late and she did not know what
   it compares. Severity 2.
7. **Empty canvas on the big graph read as her mistake.** "124,318 nodes not drawn" sat in a
   corner; her first reading was that she had picked the wrong thing. Severity 2.
8. **"hours" and "over a day" steered her off measures.** Useful warning, but it made her avoid
   Betweenness on the big graph without learning there was a faster sampled version. Severity 2.
9. **Top list cut off; the table link was missed.** She scrolled the card and needed a pointer to
   "295 more in the table". Severity 1.
10. **Jargon behind Details.** Brandes, normalization, (n-1)(n-2)/2, WebGPU, damping. She closed
    it; no harm, but no help. Severity 1.

## What she liked

- "#1 of 300" in the table and the Inspector -- a rank with its denominator.
- The Top nodes list: the answer to "who" without reading the picture.
- "Ranks below #2 may swap between runs" -- the only plain answer to "how sure".
- Export table as CSV, for her own slide.
- Names on the biggest dots in the picture.
