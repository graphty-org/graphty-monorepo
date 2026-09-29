# Session: who matters most, and how sure -- Jordan, marketing network analyst

**Participant.** Jordan, growth-marketing analyst who "does the network stuff" one or two days a
week (persona: `study/personas/marketing-analyst.md`). Played at 1440 by 900.

**Task as given by the moderator.** "Your manager wants the people who matter most in this
network, and how sure you are."

**Screens used, in order.** The results panel as a new project (`screens/results-panel.html#new-project`),
the same panel with Betweenness finished (`#finished`), the Nodes table under the map
(`#in-the-table`), the inspector with one protein selected (`screens/inspector.html#one-node`),
and the frame at rest (`screens/frame-at-rest.html`) at the end, when she went looking for where
the data lives. Renders: `shots/tasks/who-matters/`.

**Outcome.** Succeeded with difficulty. She named MAPK1 and TP53 as the top two by betweenness,
got to the full table and saw "Export table as CSV...", and read "Exact" as her certainty answer.
She did not get a sentence she could hand her manager about how sure she is: the one line that
speaks to it ("No near-ties in the top 5") sits below the fold of the panel, and the screens
disagree about whether the edges carry a weight, which cost her more trust than anything else.

**Single Ease Question.** 5 of 7.

---

## Transcript

*Moderator reads the task. Jordan is on the Results panel of a project called "Human protein
interactions". A small dark menu is open over the catalog (Family: Centrality 7, Community 4,
Path 4 ...; Source: graphty-element 25).*

**Jordan:** Okay, first -- "people"? These are proteins. MAPK1, TP53... I don't know any of these.
Fine, pretend they're creators. But you've just taken away my one trick, which is I look up our own
brand handle and see if it lands where I expect. I can't do that here. So I'm going to trust this
less than I would with my own export, just so you know.

There's a menu open. "Family", "Source: graphty-element". I don't know what graphty-element is. I
don't care. I'll close that.

*She clicks on the empty canvas; the menu closes.*

**Jordan:** Right, so what I'm looking for is a button that says "Find influencers" or "Key
people" or something. ... No. It's a list of algorithm names. Betweenness, Closeness, Eigenvector,
Harmonic centrality, HITS, Katz, PageRank. Okay. I know betweenness -- that's the bridges, the ones
sitting between the groups. That's the one I'd pick anyway, because degree just tells me the top
twenty are all big. But if my manager sat here she'd be lost at "HITS". There's no one-liner next
to any of these saying what it's for. Closeness has a little "WF-corrected" tag -- no idea -- and
Eigenvector has a yellow warning, "3 components". I'm not touching the warning one.

Also, on the left: "Assistant. Off. Nothing is sent." Good. That's the first thing I'd ask. Though
it only says the *assistant* sends nothing. Does the file go anywhere? Hold that thought.

*She clicks Betweenness in the catalog. The panel opens next to the list; on the next frame it has
finished.*

**Jordan:** Oh, that was quick. Okay -- the whole map went orange. The darker, the more
betweenness, I assume. There's a key in the bottom right: "Betweenness color, log scale, the 10
proteins at 0 take the lightest color", and then size is degree. I like that the key is actually on
the map. If I screenshot this the key comes with it. That's the "what's purple" problem, sort of
solved, although orange-to-darker-orange in greyscale is going to be... I'd have to see it printed.

Now the panel. "on: full graph, 300 nodes, 3 components. Exact. Unweighted, undirected. WebGPU.
Details." I don't know what WebGPU is and I'm going to ignore it. "Exact" has a little info circle,
so --

*She hovers the circle next to "Exact".*

**Jordan:** "Computed on every node, not estimated. It does not say the ranking is meaningful." ...
Huh. Okay, that's honest. That's more honest than Brandwatch has ever been with me. But it's also
kind of -- so what *does* say it's meaningful? My manager's question is literally "how sure are
you". I can tell her "it's exact". She'll say "exact what". This tells me what it isn't, not what I
can say.

Distribution. Grey bars, "bar height: square root of the count". Skipping that. "middle 0.0038,
highest 0.138, zero: 10 nodes, all 291=". ... "All 291 equals"? Is that cut off? All 291 equals
what? That looks broken. If I saw that in a tool I'd think something didn't load.

Top nodes: 1 MAPK1 0.1379, 2 TP53 0.1139, 3 YWHAZ 0.0695, 4 CDK1 0.0687 -- and then it's cut off by
the bottom of the panel. So MAPK1 and TP53 are way out ahead, and then 3 and 4 are basically the
same number. That's the thing I'd actually tell a VP: there are two clear ones, and then a pack.

*She scrolls the panel.*

**Jordan:** Oh -- there's more under it. "5 AKT1 0.0642. No near-ties in the top 5: the closest,
ranks 3 and 4, differ by 1.2%." Hm. Okay, see, *this* is the how-sure line, sort of. But it was
hidden under the fold. I only found it because I wanted the fifth name. And honestly "no near-ties"
followed by "they differ by 1.2%" -- 1.2% sounds like a near tie to me? To a normal person, 0.0695
and 0.0687 are the same number. So it's telling me they're not tied and my eyes are telling me they
are. I'd want it to just say "1 and 2 are clearly ahead; 3, 4 and 5 are close, the order between
them could flip."

"295 more in the table" -- that's what I want. Where's the table? That's a link.

*She clicks "295 more in the table". The map shrinks to the top half; a table opens underneath.*

**Jordan:** There it is. Okay. "Full graph: 300 nodes. Sorted by betweenness, highest first;
PageRank's columns beside it." Wait, PageRank? When did I run PageRank? It's in "In this project" on
the left now, above Betweenness. I didn't click that. ...Whatever, maybe it was already there. But
that's the kind of thing that makes me nervous -- stuff appearing that I didn't do.

Columns: id, module "from the file", degree, betweenness "exact, full graph", betweenness rank "of
300, ties share", PageRank, PageRank rank. Okay, so I'm reading down both rank columns. #1, #1. #2,
#2. #3, #3. #4, #4. #5, #5. Then it wobbles -- UBC is 6 on betweenness and 10 on PageRank.

So that's actually my answer for "how sure". Two different ways of measuring it agree on the top
five. That's the argument I'd make in the meeting. But the tool didn't say that, I had to eyeball
two columns. If there was one sentence saying "PageRank agrees on the top 5", I'd paste that
straight into the brief. PageRank and eigenvector are the same thing, right? Roughly? Whatever,
it's a second opinion.

"Export table as CSV..." top right of the table. Good. That's the thing that makes or breaks it for
me -- a ranked list out in under a minute. I'd click that. Does it give me the table as it's sorted,
with the module column? It says "table", so I'm hoping it's not a picture.

*She hovers "Export table as CSV...". The prototype does not open a dialog.*

**Jordan:** Okay, can't click through here, but it's in the right place and it says CSV, so I
believe it. Last time I hit "export" in something and got a PNG.

And the module column says "Unassigned" for most of the top ten. YWHAZ, AKT1, UBC, UBB -- all
"Unassigned". So the most important nodes don't belong to any group? That's actually interesting
for me -- in my world that'd be the connector who isn't in any one community. But the screen
doesn't say that; I'm making it up. I'd want "bridges the MAPK and DNA-repair groups" as the reason,
not "Unassigned".

*She clicks TP53 on the map. The right-hand side becomes the inspector for TP53.*

**Jordan:** Okay, now the right side is about TP53. Module DNA repair. Degree 32, "#2 of 300".
Betweenness 0.1139, "#2 of 300". PageRank 0.01137, "#2 of 300". I like the "#2 of 300" -- that's
the thing I'd put on a slide, not the 0.1139. Connections: 32 neighbors. There's a Neighbors button
and the tooltip says "Filter to neighbors, 1 hop: 33 nodes". 32 or 33? ... Probably 33 is including
itself. I'd figure it out. And a set on the left, "TP53 partners, fixed, 33". Fine.

Now -- here's the thing. Before I trusted any of this I'd check the settings. On the betweenness
panel it said "Unweighted" and the weight box said "None declared". And the right side of that screen:
"Edges: undirected, no weight". Protein links usually come with some kind of score, though, so let
me look at the data itself --

*She opens the Graph view on the rail (the frame at rest) to look at the dataset.*

**Jordan:** -- yeah, here. Statistics: "Edges 1,262, undirected, weight: confidence." So *this*
screen says the edges have a weight called confidence, and the results screen said "no weight" and
"None declared". Which is it? That's exactly the dashboard-says-4,000, download-says-3,100 thing.
If the edges have a confidence score, and the ranking ignored it, then some of those links are
weak links counted the same as strong ones, and my "how sure" answer is "less sure than I said".
And if it's not a weight, why does this screen call it one? I'd stop here and ask the data-science
guy. That's a real problem for me -- it's two screens in the same tool disagreeing.

Other thing on this screen: top left, under the project name, "This browser. Nothing sent." and the
file name, ppi-core-300.g-something. Okay, *that's* the answer to my first question. Good. I wish it
had been on the results screen too, where I started; I only found it now. That line is what gets me
past legal with a customer file.

*Moderator: "What would you tell your manager?"*

**Jordan:** "The two that matter most are MAPK1 and TP53, clearly ahead of everyone else. Then
there's a pack of three -- YWHAZ, CDK1, AKT1 -- close enough that I wouldn't rank them against each
other. It's computed on the whole network, not a sample, and a second method puts the same five on
top, so I'm fairly confident about the top five as a group." And then I'd have a footnote in my
head that says "unless the confidence weight thing matters", which I would not say out loud.

Honestly, the VP's going to read the first slide and nothing else anyway. She wants the two names.
The rest is for me, so I don't get caught out.

*Moderator: "How would it go with your full customer base, a couple of million?"*

**Jordan:** On this? No idea. Nothing on these screens tells me. It was instant on 300. On my old
Gephi setup, two million was "don't even open it". I'd want it to tell me up front how long, and
it doesn't here -- the catalog didn't show any time next to anything on this little graph.

---

## After the task

**Single Ease Question (1 very hard, 7 very easy).** 5.

**Jordan:** A five. Getting the top names was easy -- click Betweenness, read the list, click
through to the table, there's a CSV button. Two points off for the "how sure" part, because I had
to build that answer myself out of two rank columns and a sentence I found by scrolling, and then
the weight thing made me doubt all of it.

**Would you use this instead of your current tool?**

**Jordan:** Instead of Brandwatch, no -- Brandwatch gets me the data; this doesn't. Instead of
Gephi, maybe, yeah. Gephi can't tell me "#2 of 300" on a click, it doesn't put the key on the map,
and I'd never get my manager to install it. The table with the CSV button right there saves me the
Excel step, and "This browser. Nothing sent." is the line I'd screenshot for legal. What would stop
me is the same thing that stops me with every tool: the first time two screens show me two
different answers, I start checking everything by hand, and then what's the point. Fix the weight
thing and put one plain sentence on how sure the ranking is, and I'd try it on a real export.
Also -- what does it cost? Nobody's said. If it needs procurement I'm back in the notebook my
colleague set up.

---

## Problems observed

1. **The screens disagree about the edge weight** (results panel vs frame at rest). The results
   panel says "Unweighted" and "Edges: undirected, no weight" with Weight "None declared"; the
   graph overview says "undirected, weight: confidence". She read it as the tool contradicting
   itself and stopped trusting the ranking. Severity 3.
2. **"How sure" has no plain answer on screen** (results panel, finished). The "Exact" tip says
   what exact is not ("does not say the ranking is meaningful"); the near-tie sentence is below the
   fold; the strongest evidence (PageRank puts the same five on top) is only visible by comparing
   two columns by eye. Severity 3.
3. **"No near-ties" contradicts what she sees** (results panel, finished). Ranks 3 and 4 differ by
   1.2%, which reads to her as a tie; she wanted "1 and 2 clearly ahead, 3 to 5 close". Severity 2.
4. **"zero: 10 nodes, all 291="** (results panel, finished). The tie notation reads as a broken,
   cut-off value. Severity 2.
5. **The catalog is algorithm names only, with no one-line purpose** (results panel, new project).
   She knew Betweenness, but HITS, Katz, Harmonic and "WF-corrected" mean nothing to her or her
   manager, and nothing is labelled by task. Severity 2.
6. **PageRank appeared in the project without her running it** (Nodes table). Unexplained changes
   make her nervous about what else happened. Severity 1 (may be a prototype seam).
7. **No reason in words for why a node matters** (table, inspector). The top-ten "module" is
   mostly "Unassigned"; she wants "bridges group A and group B", not a number. Severity 2.
8. **"Nothing sent" is only on the graph overview** (frame at rest). She started on the results
   panel and only found the data-stays-here line at the end. Severity 2.
9. **Degree 32 vs "1 hop: 33 nodes" vs "TP53 partners 33"** (inspector). Resolved by guessing that
   33 includes TP53 itself. Severity 1.
10. **Nothing answers the two-million question** on these screens. Severity 1.

## What worked for her

- The colour key sits on the map, with the scale named, so a screenshot carries its own legend.
- "#2 of 300" beside each value in the inspector: slide-ready without explaining betweenness.
- "295 more in the table" goes straight to a sorted table, with "Export table as CSV..." in view.
- The table's two rank columns side by side let her make the agreement argument herself.
- "This browser. Nothing sent." under the project name answers the legal question in four words.
- "It does not say the ranking is meaningful" -- she called it more honest than her listening suite.
