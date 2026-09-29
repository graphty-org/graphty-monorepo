# Session: what groups are there, and how is the biggest one different -- Explorer Elena

**Participant:** Explorer Elena, a product manager with no graph training (study/personas/explorer-elena.md).
**Task, as read to her:** "On the protein network, what groups are there, and how is the biggest one
different from the rest?"
**Variant:** curious afternoon (no deadline; three or four dead ends tolerated). Where a first-contact
Elena would have stopped is marked below.
**What she saw, in order:** the Results panel with a finished grouping run on the proteins; the same
panel with the groups table open underneath the picture; the style list (which opened on a different
project); the right-hand details panel with a saved set selected; the node table sorted by rank. She
also reached, by clicking, the details panel for one detected group and its "Compare with the rest"
view, and she opened the comparison screen, which showed a payments network.
Renders: shots/tasks/groups-differ/01 to 05; the three extra views were rendered in the participant's
view for this session.

---

## 1. Results panel, grouping run finished (01-results-panel-louvain)

> "OK, colours. Lots of colours. That's already better than a hairball -- I can see blobs."

> "There's a box sitting on top of my picture. 'Run record... Method... Seed 7... Damping does not
> apply... Normalization, modularity divided by twice the total...' No. I'm closing that." (clicks
> the X)

> "Left side. 'Louvain, Sep 28.' I don't know what Louvain is. A museum? It's the thing that made the
> colours, I guess."

> "'Groups -- 10 communities.' OK! That's literally my question. Ten groups. 'Largest, 62 proteins.'
> 'Single proteins, 2, no interaction.' So two of the ten are just one dot on its own? Then it's
> really eight groups and two loners. That's kind of a cheat, calling a single dot a group, but fine,
> at least it tells me."

> "'Modularity 0.716.' 'The file's modules 0.663.' ...Is 0.7 good? Higher than the other one, so I
> guess the colours are better than the file's? I don't know what the file's modules are. Skipping."

> "Bottom right, the little key: Community 1 is orange, 62. So the orange blob on the right, with
> RPL28 and RPS8 -- that's the biggest one. And the big orange dot in the middle labelled HSP90AA1,
> that's the boss of the orange group, it's the biggest orange dot."

*(Misreading, stated confidently: the big dots are sized by number of connections, and the legend
entry "Size: degree" is in the right-hand panel, which she did not read. HSP90AA1 is not in the
biggest group's table row as its hub; the table later says AKT1.)*

> "Now how is it different... I'll click the orange blob." (clicks on the canvas cluster; in the
> mock nothing tells her what that would do) "Hm. Nothing obvious. I guess I have to find a list."

> "'Communities table.' Oh -- it was right there under the numbers. OK, clicking that."

## 2. The groups table under the picture (02-results-panel-louvain-table)

> "Ooh, a table. This I can read. It's like our dashboard. 'Full graph: 10 communities, 2 of them a
> single protein. Sorted by size.' Good, it's sorted, biggest on top."

> "Community 1: 62. Edges inside 232, edges out 93. Edges -- those are the lines? So 232 lines inside
> the orange group and 93 going out to other groups. Ninety-three is the most going out of anyone.
> The next is 63. So the biggest group is also the most... sociable? It talks to everybody else the
> most."

> "'Density inside' 0.123. Everyone else is 0.17, 0.22, 0.25. So the big one is the lowest. Lower
> density is... less crowded? Less packed? I'd have guessed a big blob is more packed. Not sure what
> to do with that. I'll write it down but I wouldn't say it out loud in a meeting."

> "'log2FoldChange, mean, vs the rest.' Nope. I have no idea. +0.02 versus +0.09. Tiny numbers
> either way. I'm going to assume that means 'about the same', but honestly I'm guessing."

> "'Hub, highest degree': AKT1. Wait. I thought HSP90AA1 was the boss of orange. The table says
> AKT1. OK, the table wins, the table has a header. So I was wrong about the big dot. Good to know
> the picture lies to me a bit." *(She reverses her earlier misreading only because a table column
> contradicted it; she still does not know what makes a dot big.)*

> "'Module, from the file; most members': Ribosome, 56 of 62. OK, THAT is a real answer. Nearly all
> of the biggest group are ribosome proteins. I remember ribosomes from school, sort of. The others
> are Proteasome, Complex I, Spliceosome, MAPK signaling, TGF-beta, Cell cycle, DNA repair. So each
> colour is basically one of these. 'From the file' -- so the file already knew this and the
> colouring just... found it again? That's reassuring actually, it agrees with the file."

> "Community 9 and 10, size 1, 'not defined', 'Unassigned 1 of 1'. Those are the two loners.
> GSK3B and NOTCH1. Fine."

**Her sentence at this point:** "The proteins split into eight real groups plus two loners. The
biggest one, 62 proteins, is almost all ribosome proteins, and it has way more connections going
out to the other groups than any of the others."

*(A first-contact Elena would likely stop here, satisfied: she has a sentence she could paste into
Slack. Elapsed so far: a few minutes.)*

## 3. The style list (03-styles-list)

> "Wait, what happened. 'Stress response study.' That's not the name I had. It said 'Human protein
> interactions' before. And everything's brown now. Did I open someone else's project? Or did I
> click something and wreck my colours?"

> "There's a big popup, 'Betweenness as color... Scale: Log... Each value is divided by 0.000077,
> the smallest above 0, before the log.' I'm not reading that."

> "My orange-blue-green groups are gone. I probably clicked something wrong." *(Self-blame first.)*
> "I'll leave this alone and go back. There's nothing about my groups here."

*(Dead end one. The screen shows a different project and a different colouring; nothing on it
connects to her question, and she does not see a way back to the group colours.)*

## 4. Details panel with a saved set selected (04-inspector-set)

> "OK, the name's back, 'Human protein interactions'. Phew. But the colours moved. Now the orange
> blob is on the LEFT, and the right side one is light blue. And the key says Ribosome is light blue
> 56, Proteasome is orange 40."

> "So... is the biggest group orange or blue now? Before, orange was Community 1, the biggest, the
> ribosome one. Now orange is Proteasome. I really thought orange meant the big one." *(She had
> attached "orange = the biggest group" to the colour, not to the legend; two screens colour by two
> different things and the ribosome cluster is orange on one and light blue on the other.)*

> "And a whole lot of the middle is grey now. Grey means... not in a group? The loners? But there
> were only two loners and there are like fifteen grey dots." *(Misreading: grey here is 'Other' and
> 'Unassigned' in the file's module list, not the two single proteins from the grouping run.)*

> "Right side: 'DNA repair, 30 nodes, Rule set.' That's not the biggest group. Statistics, members
> TP53, BRCA1... This is about a different group. There's a 'Compare with the rest' button, but it's
> for DNA repair, not mine."

> "Can I get my group into this panel? ... There's a list on the left, 'Sets and paths', DNA repair
> and TP53 partners. My biggest group isn't in there. I don't know how to put it there."

*(Engagement dips: shorter answers. She goes back to the groups table, the one place that worked.)*

> "Back to the table. I'll just click the Community 1 row and see what happens."

### The details panel for one group, and its comparison (reached by clicking a group)

> "OK, now the right side says 'Community 4, 4 of 10' -- huh, I clicked... whatever, there are little
> arrows, 4 of 10. I'll click back to 1." *(The rendered group view is Community 4; she steps to 1 with
> the arrows.)*

> "Size, edges inside, edges out. Same as the table. 'Compare with the rest' -- there it is again,
> and this time it's my group. That's what the question literally says. Clicking."

> "'Compared with the rest. Descriptive only; no statistical test.' I don't know what that is
> protecting me from, but OK. '62 proteins in Community 1, 238 in the rest.' Good, that adds up to
> 300."

> "log2FoldChange again, now with little dot strips and boxes. 'Median, group -0.02, rest 0.05.'
> Wait -- the table said +0.02 versus +0.09. Now it's -0.02 versus 0.05. Which is it? Is it plus or
> minus?" *(She does not notice the table says "mean" and this says "median". She now distrusts the
> number itself.)*

> "'Rank-biserial r -0.02, effect size, not a significance test.' No idea. Zero-ish, so nothing?"

> "Degree: group 9, rest 8. So the big group's dots have about the same number of lines as
> everybody else's. So it's not special that way."

> "'Enrichment analysis isn't part of graphty.' ...OK? I didn't ask for that. Sounds like something
> a scientist would want."

> "So the honest answer is: the biggest group isn't really different on the numbers. It's bigger, it's
> the ribosome one, and it has the most lines going out. That's it. I kind of expected the compare
> button to tell me in one sentence what's different, and instead it's a bunch of boxes that say
> 'basically the same'. Maybe that IS the answer. I can't tell if that's the tool being careful or me
> not getting it."

## 5. Node table sorted by rank (05-table-dock-ranked)

> "This is a list of the dots, not the groups. MAPK1, TP53, YWHAZ... 'Community 8', 'Community 6'.
> Betweenness, pagerank, near tie... This is for a different question. The groups tab is still up
> there, 'Communities: Louvain', so I know where to go back to."

> "Every other row in 'module' says Unassigned, but they're all in a Community. So the file doesn't
> know which group these middle ones belong to, but the colouring put them somewhere anyway. That's
> interesting, actually. The ones in the middle get stuffed into a group even though the file didn't
> say." *(A correct and useful reading she got by accident, from a screen meant for something else.)*

## The comparison screen (screens/comparison)

> "'Payments network review.' That's... money? Accounts? This isn't my protein thing at all. I'm not
> looking at this." *(Closed without reading. Dead end two.)*

---

## Her final answer

> "Ten groups, but two of them are single proteins on their own, so eight real ones. Each one lines
> up with a label that was already in the file: ribosome, proteasome, Complex I, spliceosome, and so
> on. The biggest is 62 proteins, 56 of them ribosome. It's different from the others because it has
> the most connections going out to the other groups, 93, and it's the least tightly packed. On the
> other numbers -- the fold-change thing and how many lines each dot has -- it's about the same as
> the rest."

Accuracy against the run: correct on the count, the two single proteins, the size, the ribosome
match, edges out and lowest density. The fold-change and degree reading ("about the same") matches
the comparison view. She holds one unresolved doubt (plus or minus on fold change) and one
uncorrected misreading (grey dots in the file-module colouring are "not in a group").

## Single Ease Question

**5 of 7.**

> "The table was easy. Honestly, the table was the whole thing. The rest was me getting lost in
> other people's projects and colours changing on me. And I still don't trust that fold-change
> number, because it said two different things. If it had been just the first two screens, I'd
> say 6."

## Would she use this instead of her current tool?

> "My current tool is a spreadsheet and a pivot table, and a pivot table can't find groups for me.
> So for 'are there groups', yes, I'd use this, because the groups table told me something I couldn't
> have got any other way, and it checked itself against the labels I already had. For 'how is it
> different', not on its own -- I'd take a screenshot of that compare box to someone who knows what
> log-two-fold means and ask them if 'basically the same' is the finding or a problem. I'd use it
> for the first half and hand off the second."

---

## What the session runner saw

- **The groups table carried the task.** Size, lines inside and out, and "module from the file,
  most members" gave her a pasteable sentence within a few minutes. The file-module column was the
  single strongest moment: it told her what each group IS and reassured her that the grouping agreed
  with the file.
- **She missed "Communities table" on first look** and tried clicking the orange cluster on the
  canvas first; she found the link only after the canvas gave her nothing.
- **Two contradictory numbers.** The table shows the group's mean fold change (+0.02 vs +0.09); the
  comparison view shows the median (-0.02 vs 0.05). She did not notice mean versus median and read
  it as the tool contradicting itself, which lowered her trust in the whole comparison. This is the
  point where she began to blame the tool rather than herself.
- **Colour meaning did not survive screen changes.** The ribosome group is orange when coloured by
  the grouping run and light blue when coloured by the file's modules. She had tied "orange" to "the
  biggest group" and was lost for a while when it became Proteasome. She read grey (file module
  "Other" / "Unassigned") as "not in any group", confusing it with the two single proteins.
- **Two screens were someone else's data.** The style list opened on a project named "Stress
  response study" with a single brown colouring, and the comparison screen was a payments network.
  She blamed herself for the first ("I probably clicked something wrong") and dismissed the second.
  Neither moved her task forward.
- **Jargon she skipped or guessed:** Louvain, modularity, "the file's modules" as a score, density,
  log2FoldChange, IQR, rank-biserial r, effect size, "descriptive only; no statistical test",
  enrichment analysis. She got "edges" from context as "lines".
- **"Compare with the rest" was noticed but first seen on the wrong group** (the DNA repair set);
  she used it only after clicking a group row. The comparison answered her question with "not much
  different", which she could not tell apart from "the tool is being careful".
- **Misreading of node size:** she named the largest dot in the orange cluster as the group's boss;
  she corrected herself only because the table's "hub" column disagreed, and still does not know
  size shows number of connections.
- **Engagement:** high through the groups table; dropped to short answers on the style list and the
  saved-set details panel; recovered on the group comparison; dismissive on the payments screen.
