# What does the weight mean, asked at the first run -- newcomer student (round 3)

**Task, as the moderator gave it:** "Run PageRank on a network whose edges have a confidence column
you have never thought about."

**Screens used, in order:** the option form with a cost (Betweenness on the 300-protein network
refusing to use "confidence", then the question that refusal opens), then the Results panel (the
Louvain result on the same network that repeats the answer, the Closeness variant state, and the
not-run state on the patent network for how a run starts).

**About the participant.** There is still no persona file for this participant, so she is the same
assumed character as in round two: built from the project's first-time-user persona (Explorer
Elena) and the round-one finding that newcomers cannot read legend and statistics words. Her
vocabulary and patience are assumed, not evidenced.

*Assumed portrait:* Leah, 20, second-year biology undergraduate, class project on a protein
interaction list her TA exported from STRING. To her, STRING's score is "how sure they are the
interaction is real". She knows PageRank as "the Google thing" from a lecture slide. She blames
herself first.

**Note on the mocks.** There is still no PageRank option form for the protein network, and no
finished PageRank result on it that names its weight. After clicking PageRank, Leah's steps are
her guess at what would open, based on the Betweenness form. The only protein result that shows
the weight answer is a Louvain one.

---

## Think-aloud

### 1. Landing

"Human protein interactions, 300 nodes, 1,262 edges. Right side: 'weight -- confidence: numbers,
not used'. OK, that's clear, it sees my column and it isn't using it. Not used for what, though?"

"There's a Betweenness box open with a yellow warning. I didn't open that. My task is PageRank,
which is at the bottom of the list on the left. I'll click it."

*Clicks PageRank in the catalog. The prototype has no PageRank form here.*

"Nothing. OK, so I'll read the box that's already open. Maybe it's the same kind of thing."

### 2. The warning

"'Can't weight paths by confidence: confidence isn't set up as a length yet.' A length? It's not a
length, it's a score from zero to one. Why would I set it up as a length? That word throws me."

"Then: 'Until you say what a higher confidence means, no measure uses it, PageRank included.' Oh,
good -- that line is actually for me. It says PageRank too. So PageRank won't use it unless I
answer something. That answers what I was wondering last time: yes, this question is my
question too."

"Blue button, 'Set up confidence'. That's the only thing to click, so I click it."

### 3. The question

"'For confidence, a higher number means...' and my real numbers, 0.99, 0.79, 0.40. Good, same as
before, it's looking at my data."

"'A closer or stronger link.' 'A longer or costlier step.' 'More can pass through.' 'Don't use
confidence.'"

"Still no 'the link is more likely to be real'. That's what it means. Hmm. 'A closer or stronger
link' -- stronger is closer to what I mean than 'costlier step'. A costlier step would be
backwards; my best links would count as worse. 'More can pass through' -- I don't know, like a
pipe? No."

"'Don't use confidence' is nice -- that's clear, I get what that does. Before there was some
'decide later' thing with a hover I had to find. This is simpler."

"I'll go with 'a closer or stronger link'. Maybe 70 percent sure this time -- the word 'stronger'
kind of fits 'more sure'. I'd still want to ask my TA."

"'Nothing runs until you answer. The answer is kept on confidence: every measure and the Path tool
read it.' OK so it's not just for this one box, it's for the whole column. That's fine, actually
that's what I'd want -- I don't want to answer it five times. But if I pick wrong, where do I
change it? It still doesn't say. Probably this same dropdown?"

"Wait, the warning said Betweenness needs it as a 'length'. I just picked 'stronger link', not
'longer step'. So will Betweenness refuse again? I don't care about Betweenness, but it makes me
think I picked the 'wrong' one for the computer."

"And the top says 'Finished, unweighted. Undirected. Edit held.' Edit held? Held where? I'm
ignoring that."

### 4. Running PageRank

"Now I'd go back to PageRank. I'm guessing its box looks like the patent one -- Scope, Direction,
Weight, a Damping number. I don't know damping. I leave it. Weight would say confidence now, I
hope. Then the blue Run button."

### 5. Checking it used my answer

*Looks at the Louvain result on the same protein network, the nearest screen to "after a run with
my answer".*

"Oh, this is what I wanted last time. 'Weight: confidence, higher = stronger link (your answer)'.
It literally says 'your answer'. OK, so it did take what I said. I'd trust that."

"Details opens a record thing: 'confidence used as given, 0.40 to 0.99; higher = stronger link'.
Used as given -- good, it didn't do weird math to it."

"But this is Louvain, not PageRank. If my PageRank box says that same line, I'm happy. If it says
'Unweighted' like the Closeness one here ('Weight: None declared', 'Exact. Unweighted,
undirected'), I'd be confused again."

"On the right it now says 'undirected, similarity weight'. Similarity? I didn't say similarity.
Oh -- that little grey word next to 'stronger link' was 'similarity'. So that's what it calls it.
I wouldn't have known that matched."

"There's also a table screen with a PageRank column that says 'exact, full graph' -- it doesn't say
if confidence was in it. I'd want that column to say weighted or not."

### 6. Wrap-up

"I think I ran PageRank with confidence as 'stronger'. Better than last time, because it said
PageRank uses nothing until I answer, and a result can say 'your answer'. But the choices still
don't have my actual meaning, and I only saw 'your answer' on a different measure."

---

## After the task

**Single Ease Question:** 4 of 7. "Easier than before -- it told me PageRank was waiting on my
answer and the result said 'your answer'. But I still had to squeeze 'how sure it's real' into
'stronger link', and the 'length' warning made me doubt it."

**Would she use this instead of her current tool?** "Probably yes for the project, over Cytoscape
with the handout. It noticed my column, showed my real numbers, and it won't secretly use it. If
the PageRank result had that 'your answer' line I'd screenshot it for my TA as proof. I'd still ask
her if 'stronger link' is right for a STRING score."

---

## Problems observed

1. **The question still has no choice for "how sure the link is real".** A reliability or
   probability score is the most common confidence column; she mapped it to "a closer or stronger
   link" at about 70 percent confidence. Severity 3.
2. **"Isn't set up as a length yet" in the warning.** "Length" is a word she would never use for a
   0-to-1 score, and it primes her to think the "right" answer is "a longer or costlier step", the
   opposite of what she means. Severity 3.
3. **No PageRank form or PageRank result on this network in the prototype.** The confirming line
   ("Weight: confidence, higher = stronger link (your answer)") only appears on Louvain; the
   Closeness and table views on the same network say "Unweighted" / "None declared" / "exact, full
   graph" with no weight mention, so she could not confirm PageRank used her answer. Severity 3.
4. **No pointer to where the answer can be changed later.** "Kept on confidence: every measure and
   the Path tool read it" makes the choice feel global and permanent. Severity 2.
5. **"Similarity" appears in Statistics as the name of her choice.** She did not connect the grey
   word beside "stronger link" to it until she hunted. Severity 2.
6. **"Edit held" in the state line is unreadable jargon.** Ignored. Severity 1.

## What worked

- "No measure uses it, PageRank included" answered last round's biggest doubt: the question is hers
  too, and nothing quietly uses the column.
- The result line "Weight: confidence, higher = stronger link (your answer)" and "used as given,
  0.40 to 0.99" is exactly the confirmation she asked for.
- "Don't use confidence" is a clearer way out than a hidden "decide later" hint.
- Her own values (0.99, 0.79, 0.40) as examples keep her sure it is looking at the right column.
- "Statistics: confidence: numbers, not used" is readable at a glance.
