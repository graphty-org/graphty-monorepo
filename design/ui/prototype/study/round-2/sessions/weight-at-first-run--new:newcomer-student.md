# What does the weight mean, asked at the first run -- newcomer student

**Task, as the moderator gave it:** "Run PageRank on a network whose edges have a confidence column
you have never thought about."

**Screens used, in order:** the option form with a cost, first state (Betweenness on the
300-protein network, asking what "confidence" means), then the Results panel (the finished
protein result, the variant state on the same network, and the not-run state on the patent
network, for how a run starts).

**About the participant.** The persona file for this participant did not exist when the session
ran, so the character was built the same way as in her other round-two sessions: from the
project's first-time-user persona (Explorer Elena) and the round-one finding that legends and
first statistics use words newcomers cannot read. Treat her vocabulary and patience as assumed.

*Assumed portrait:* Leah, 20, second-year biology undergraduate, class project on a protein
interaction list her TA exported from STRING. She knows STRING's "combined score" is "how sure
they are the interaction is real". She has never thought of it as a length or a strength. She
knows "PageRank" only as "the Google thing" from a lecture slide. She blames herself first.

**Note on the mocks.** There is no PageRank option form for the protein network. The only screen
that asks what "confidence" means is Betweenness. Leah's steps after clicking PageRank are her
guess at what would open, reasoned from the Betweenness form and from the PageRank forms on the
patent network in the Results panel. The finished protein screens show "no weight", which does not
match the network in the first screen; she noticed.

---

## Think-aloud

### 1. Landing on the form

"OK, Human protein interactions, 300 nodes, 1,262 edges. On the right it says 'weight: confidence,
meaning not set'. Meaning not set? It's confidence. It means confidence. I'm not sure what else
it's supposed to mean."

"There's already a Betweenness thing open. I didn't pick that. My task says PageRank. PageRank is
at the bottom of the list on the left, under Katz. I'd click that."

*Clicks PageRank in the catalog. The prototype has no PageRank form for this network.*

"Nothing happens here, so I'll guess it opens the same kind of box as the Betweenness one, just
with PageRank at the top. Let me read the Betweenness one so I know what it will ask."

### 2. The weight field

"Weight: confidence. Good, it found my column. Underneath: 'Read as a distance. Not used while its
meaning is not set.' Wait -- so is it read as a distance or is it not used? That's two opposite
things in one sentence. And I haven't told it anything yet, so who decided 'distance'?"

"A distance. Hm. If 0.99 is a distance then my surest interactions are the farthest apart? That's
backwards. That can't be what it's doing... I think it's saying 'if you tell it, it would read it
as a distance'. I'm guessing."

### 3. The question

"'In confidence, does a bigger number mean a stronger tie, a longer distance, or an amount that
flows?' ... None of those, honestly. A bigger number means they're more sure it's real. It's not
a tie, it's a probability kind of thing."

"The examples help a bit: 0.99, 0.79, 0.40. Those are my numbers, so at least I know it's looking
at the right column."

"Stronger tie -- 'similarity' in grey. Longer distance -- 'distance'. An amount that flows --
'capacity'. Capacity like... how much water fits in a pipe? Proteins don't flow. So it's between
stronger tie and not sure."

"More sure it's real, is that 'stronger'? I guess if it's more likely real it counts more. I'd
probably pick Stronger tie. But I'd be like 60 percent."

*Hovers the little i next to "Not sure -- decide later".*

"'Until it is set, paths and Betweenness leave confidence out. PageRank and community detection
read a bigger number as a stronger tie.' Oh. So for PageRank it already reads it as stronger tie
even if I say not sure? Then why is it asking me? And would PageRank even ask, or is this
question only for Betweenness? I'm doing PageRank. I genuinely don't know if this question is my
question."

"'How it is converted' -- I'm not opening that, it sounds like math."

"'Kept on confidence, so no run asks again.' That's a bit scary. So if I get it wrong now it
remembers forever and never asks again? Where would I change it? It doesn't say."

### 4. Running

"OK. For PageRank I'd pick Stronger tie, because the i thing says PageRank thinks that anyway, so
I'm agreeing with the computer. Then Run, the blue button top right of the box."

*Moves to the Results panel, finished state, as the nearest screen to "after Run".*

"This one's colored all orange, cool, and there's a Top nodes list and MAPK1 at the top. But this
is Betweenness, not PageRank. And -- 'Exact. Unweighted, undirected.' Unweighted? And the weight
box says 'None declared', and on the right 'Edges: undirected, no weight'. Where did confidence
go? Did it just drop my column?"

*Looks at the Closeness screen on the same network: "Weight: None declared" again.*

"Same thing. So I can't tell if my answer did anything. If this were PageRank and it said
'Unweighted' I'd assume I did something wrong and redo it. Or honestly I'd just screenshot the
top five and put it in my slides and hope."

"On the patent one there's a PageRank row that says 'under a minute' and a Damping box. I don't
know what damping is. I'd leave it."

### 5. Wrap-up

"I think I ran PageRank? Probably with confidence as stronger tie? But nothing afterwards
confirmed it, and the question before didn't have my actual meaning in it."

---

## After the task

**Single Ease Question:** 3 of 7. "Clicking Run is easy. Knowing if it did the right thing with
my confidence numbers isn't."

**Would she use this instead of her current tool?** "Maybe. In STRING I just see a picture and
Cytoscape I only did with the handout. At least this one noticed my column and showed my real
numbers, and it asked me instead of doing something silent. If it had an option like 'how sure
it is that the link is real' and then the result said 'used confidence as strength', I'd trust
it. Right now I'd ask my TA before I believed the ranking."

---

## Problems observed

1. **The question does not offer the meaning she actually has.** "How sure the link is real" is
   not stronger tie, distance or flow; she mapped it to "stronger tie" at about 60 percent
   confidence. Severity 3.
2. **"Read as a distance. Not used while its meaning is not set."** reads as a contradiction and
   as a decision already made ("distance") before she answered. Severity 3.
3. **Does PageRank ask at all?** The hint says PageRank already reads a bigger number as a
   stronger tie when the meaning is not set, so she could not tell whether the question was hers
   (PageRank) or only Betweenness's. No PageRank form exists for this network. Severity 3.
4. **Nothing after the run confirms the weight was used.** The finished and variant screens on
   the same network say "Unweighted", "Weight: None declared" and "no weight", so she believed
   her column was dropped. (Partly a mock inconsistency; still what a newcomer would see if the
   result line does not name the weight.) Severity 3.
5. **"No run asks again" with no pointer to where it can be changed** made the choice feel
   permanent and risky. Severity 2.
6. **Secondary terms** ("capacity", "similarity") and "Damping" were read as jargon and ignored;
   harmless because she ignored them, but they gave no help. Severity 1.

## What worked

- The weight field already showed her column by name, and the examples were her real values
  (0.99, 0.79, 0.40), so she trusted it was looking at the right data.
- Asking, instead of silently deciding, made her feel the tool was being careful.
- "Not sure -- decide later" was a real escape hatch she would have used without the hint.
