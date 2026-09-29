# Running PageRank when a column's meaning is unknown -- Jordan, marketing network analyst

Participant: Jordan, a growth-marketing analyst who does "the network stuff" one or two days a
week. She uses Gephi, NodeXL and a colleague's networkx notebook, and she calls every centrality
an "influence score".

Task as given by the moderator: "Run PageRank on a network whose edges have a confidence column
you have never thought about."

Screens used: the measure-options mock (starting at its first state) and the Results panel mock.
Renders read: `shots/screens__option-form-cost.png`, `shots/option-form-cost-weight-refused--notes.png`,
`shots/option-form-cost-weight-meaning.png`, `shots/option-form-cost-within-budget.png`,
`shots/screens__results-panel--not-run.png`, `shots/screens__results-panel--running.png`,
`shots/screens__results-panel--finished.png`.

## Transcript

**First screen.**
"OK. 'Human protein interactions'. Not my world, but fine, it's a network, 300 nodes, 1,262
edges. I was told PageRank. What's open is... Betweenness. I didn't open that. Somebody left
Betweenness open. And it's got a yellow warning already before I've done anything."

"Right-hand side, Statistics: 'weight -- confidence: numbers, not used'. So there's a confidence
column. That's the one I've 'never thought about'. Honestly that's most columns in a vendor
export. Brandwatch gives me a sentiment confidence and I have never once looked at what it
means."

**Looking for PageRank.**
"Left side, Catalog, Centrality -- Betweenness, Closeness, Eigenvector, Harmonic, HITS, Katz,
PageRank. There it is, at the bottom. I'd click that. (Moderator: the prototype only has the
Betweenness form built for this part -- carry on with what's open.) OK, so the Betweenness card
is what I get. That's annoying, but PageRank and Betweenness are both influence scores, so
presumably it works the same."

**The warning.**
"'Can't weight paths by confidence: confidence isn't set up as a length yet.' A *length*? It's
a confidence. It's not a length of anything. I don't know what that sentence wants from me."

"The grey bit under it: 'Betweenness counts shortest paths. Until you say what a higher
confidence means, no measure uses it, PageRank included.' OK -- that last bit I actually like,
because it mentions PageRank, which is the thing I was sent to do. So it's telling me PageRank
also won't use confidence until I answer something. That's the useful sentence. It's the third
line of grey text though. I nearly didn't read it."

"And 'Weight by: confidence' with a yellow mark. Did I set that? I didn't. Either the tool
picked it or whoever was here before me did. If the tool picked a column I've never heard of and
then yelled at me about it, that's weird."

**The button.**
"There's no Run. There's a blue 'Set up confidence'. It's the only blue thing, so... fine, I'll
click it. I'd have clicked Run if there was one."

**The question.**
"'For confidence, a higher number means...' Examples 0.99, 0.79, 0.40. Options:
a closer or stronger link -- similarity. A longer or costlier step -- distance. More can pass
through -- capacity. Don't use confidence."

"OK. Higher confidence is... more sure the link is real? So 'stronger link'. That's the only
one that reads like English for me. 'Costlier step' -- no. 'More can pass through' -- that's
plumbing. The little grey words, similarity, distance, capacity, I'd ignore those."

"But here's my honest reaction: I don't *know* what confidence means in this file. It's
somebody else's column. If it were my mention export, 'confidence' might be the vendor saying
how sure they are the mention is about our brand. Is that a 'stronger link'? Kind of? I'd pick
it because it's the closest, not because I know. I'd probably also think about 'Don't use
confidence' because then I don't have to defend it to anyone. My VP won't ask."

"'Nothing runs until you answer. The answer is kept on confidence: every measure and the Path
tool read it.' Hm. So whatever I click here sticks for everything. That's good if I'm right and
bad if I'm guessing. Is there an undo? It doesn't say I can change it later. (Moderator: what
would you do?) I'd pick stronger link and hope."

"And Run is grey at the top until I pick. OK, at least it's not going to run something I
didn't mean. That's fair."

**Something that contradicts itself.**
"Down under 'Readings' it says 'Unweighted: every interaction counts the same.' But the box
above says Weight by confidence. So which is it? I guess the reading is from last time? It
doesn't say 'last run' anywhere. This is the dashboard-says-4,000-download-says-3,100 thing.
Two numbers that disagree on one screen and I'm supposed to know which one is live."

**After answering -- looking for the PageRank result.**
"(Moderator points at the Results panel screens.) OK, now it's patents. PageRank running on
WebGPU, under a minute, blue bar, Cancel. Good, I can see it's moving. That's the thing Gephi
never gave me."

"But Weight says 'None declared'. That's a different file, fine, but I'm looking for proof my
confidence answer went into PageRank and I can't find it on any screen I'm shown. The finished
one on proteins says 'Exact. Unweighted, undirected.' and the side panel says 'undirected, no
weight'. Earlier the same side panel said 'confidence: numbers, not used'. Different words for
the same spot. So after all that, did PageRank use confidence or not? I'd want the result to
say, in the first line, 'weighted by confidence, higher = stronger'. That's what I'd screenshot
for the deck."

"The top-nodes list is there at the bottom of the finished card -- MAPK1 first. Good, a
ranking. I'd want a CSV of that. There's 'Export...' top right, I'd try that next. Probably
get a picture."

**Laptop width.**
"On my laptop screen the card, the catalog and the stats panel eat most of it. The map is a
strip in the middle with half the nodes behind the card. I'm not looking at the map right now,
so OK, but I'd close the right panel if I could find how."

**Drift.**
"The whole reason I have mystery columns is the listening vendors keep changing what they
export. Last quarter the confidence column appeared out of nowhere with no documentation. I'm
not blaming this tool for that. But it means I'll hit this question every single file."

## After the task

**Single Ease Question: 4 of 7.**
"I got there, mostly. The asking-me thing is actually right -- I'd rather be asked than have it
quietly use a number I don't understand. But the first sentence talks about 'lengths', the
thing I was sent to run wasn't the thing that opened, and at the end I couldn't see on the
result that confidence was used. I'd give it a four."

**Would you use this instead of what you use now?**
"For this bit? Maybe. Gephi would just have let me pick the weight column or not and never
asked what it means, and I'd never have known PageRank treats it as 'stronger'. This at least
makes me say it out loud. But I'm guessing when I answer, and it keeps my guess for every
measure. If the result card said plainly 'weighted by confidence (higher = stronger link) --
change' I'd trust it. Right now I'd probably pick 'Don't use confidence' just so I don't have
to explain it to anyone, which is maybe not what you want."

## Problems seen

1. The warning speaks about "length" for a column the reader thinks of as a certainty; the first
   sentence does not tell her what to do. (Severity 3)
2. The weight was already set to confidence before she touched anything, so the refusal feels
   like the tool blaming her for its own choice. (Severity 2)
3. The one sentence that names PageRank is the third line of small grey text. (Severity 2)
4. The meaning question offers no "I don't know" beyond "Don't use", and says the answer is kept
   for every measure without saying it can be changed later -- an unsure guess becomes a
   project-wide fact. (Severity 3)
5. "Readings: Unweighted" sits under "Weight by: confidence" with no "last run" marker; two
   facts on one card disagree. (Severity 3)
6. No screen shows a finished PageRank that says it was weighted by confidence and which way;
   the same side-panel row reads "confidence: numbers, not used" on one screen and "no weight"
   on another. (Severity 3)
7. The prototype opens Betweenness, not PageRank; she found PageRank in the catalog but could
   not open it. (Severity 2, a prototype gap more than a design one)
8. "edit held" in the project list is unexplained jargon. (Severity 1)
