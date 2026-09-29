# Read the numbers -- Tom, the recipe recipient

**Participant:** Tom, lab manager, 52, reads shared network files and never builds them
(`study/personas/recipe-recipient.md`).
**Task as given:** "You loaded 300 proteins and filtered to one module. Explain every count on
screen, and why the node count is not 300."
**Screens seen, in order (study view, as a participant sees them):**
`shots/tasks/read-the-numbers/01-load-step-graphml.png`, `02-frame-at-rest.png`,
`03-filter-chip-proteins.png`, `04-results-panel-finished.png`, and the navigation screen
(`shots/tmp/rtn-tom/nav.png`).
**Outcome:** succeeded on the main question, with difficulty on the rest. He explained the
300, the 1,262, the 56, the 244 and the 217, and why the count is not 300. He could not explain
"linked pairs", "Attributes 4", the blank "Unassigned" row, "Hubs 0 of 10" or "all 291=". He
also noticed that the words for the same two things change from screen to screen.

---

## 1. The open dialog

> "Open ppi-core-300.graphml. Fine, that's the file name the postdoc uses. 'Sample, first 5 of
> 300 nodes' -- PSMA1 to PSMA5, Proteasome, fold changes. Those look like our genes, not
> dates. Good.
>
> 'What will load: nodes 300, edges 1,262.' Three hundred is what she said. I'll take 300 as
> 'proteins'. Edges, I assume, are the lines between them. I don't know if 1,262 is right; I
> don't have that spreadsheet. I'd have to ask her.
>
> 'Weight: confidence, not used yet.' Not used *yet*? Is something going to use it later
> without asking me? Or is something missing? I'm not touching it. Load."

He does not open the "Read as" or "Role" drop-downs ("Role: None -- I don't know what a role
is, and it says None, so it's doing nothing").

## 2. The full graph

> "OK, a picture with coloured clumps. The legend on the bottom left -- I read legends.
> Ribosome 56, Proteasome 40, Complex I 35, Spliceosome 32, MAPK signaling 31, DNA repair 30,
> Cell cycle 29, TGF-beta 21, Other 26." (He adds them on paper.) "That's 300. Good, the
> legend adds up to the number of proteins. That I like.
>
> The dialog said 'Category, 9 values'. I count eight names plus Other. So is 'Other' a module
> called Other, or is it the leftovers from several? I can't tell.
>
> And there's 'Unassigned' underneath with no number next to it. Is that zero? Or did it not
> count them? If it's zero, just say zero. A blank next to a number column makes me think
> something didn't load."

He moves to the right-hand panel, the numbers.

> "Nodes: 300 nodes. Yes.
>
> Edges: 1,262 edges (rows). Rows -- rows of the file, I suppose. Like a spreadsheet where each
> line is one interaction. That's a word I understand.
>
> Linked pairs: 1,262 linked pairs. Same number. Different name. Hang on. Either those are the
> same thing, in which case why tell me twice, or they are different things that happen to be
> equal today, in which case what's the difference? I don't know. There's a little 'i' next to
> it. I'm not hovering over every little 'i'. If the PI asks 'how many interactions', I'd say
> 1,262, and I'd hope that's the same whichever line I read.
>
> Density 0.0281 -- no idea, skip. Degree distribution, a tiny bar chart -- skip.
>
> Connected components: 3 (2 isolates). I think that means one big blob plus two proteins on
> their own. I can see a couple of loose dots out at the edges -- top right, bottom right. But
> there are more than two stray dots on the picture, some on the far left. Some of those have a
> line going in. So probably two with no line at all. That's my guess. I wouldn't say it in lab
> meeting.
>
> Attributes: 4. The dialog told me 2 node attributes and 1 edge attribute. That's 3. Where is
> the fourth? Is it the ID? Did it add something? And '5 more' underneath -- 5 more what? I'd
> ask her about this bit."

Bottom strip: "Table 300 nodes, 1,262 edges (rows)."

> "Same numbers as the panel. Good. At least those agree."

## 3. Filtered to the Ribosome module

> "Now the button at top left says '56 of 300 proteins, 1 step'. Right away that answers the
> question. It's not 300 because I only kept one module. And 56 is the Ribosome number from the
> legend before. That matches. I'd have been worried if it didn't.
>
> The filter box: 'Filter to module Ribosome, took out 244, 56 left.' 244 plus 56 is 300. That
> is the sentence I'd say to the PI: we kept the ribosome, 244 others are hidden, 56 are left.
> That's the best thing on any of these screens."

He reads the Statistics block.

> "Proteins 56 of 300. Fine.
>
> Interactions 217 of 1,262. Wait, before it was 'edges (rows)' and 'linked pairs'. Now it's
> 'interactions'. Which of the two is this 217 of? The rows or the pairs? Before, they were the
> same number, so maybe it doesn't matter, but the screen made a point of having two kinds and
> now it's dropped one. Also: it called them nodes a minute ago, now they're proteins. Proteins
> is better, honestly -- that's what they are. But I'd like it to pick one.
>
> 217 of 1,262 -- so most of the lines went away with the proteins. That makes sense: if you hide
> 244 proteins, their lines go too. Nobody told me that in words, I worked it out.
>
> Components 1, Largest component 56, Isolated proteins 0. One blob of 56, nobody on their own.
> Fine. Every line says 'of the filtered graph (56 of 300 proteins)'. Six times. I got it the
> first time.
>
> Average degree 7.75. Degree again. I think it's how many partners each one has. Density 0.141,
> skip."

The table under the picture.

> "'Filtered graph: 56 of 300 proteins.' Good. Columns: Degree (filtered) and Degree (full
> graph). RPL28, 14 and 17. OK -- I think that's 14 partners inside the ribosome and 17 overall.
> That actually is useful; the extra 3 must be to proteins outside the module. If I'm right.
> The word 'degree' I'd still have to ask about, but the two columns side by side told me more
> than the word did."

Left panel.

> "'Interactions 300 proteins' in the list on the left. So that line still says 300 while the
> button says 56. I suppose that's the whole file. And 'Hubs, rule, 0 of 10' with a little
> funnel. Zero of ten what? Zero hubs out of ten hubs? Ten proteins? Did my filter wipe out the
> hubs? Is that wrong? I'm not clicking a thing called 'rule'."

## 4. The results screen

> "This one says 'Full graph' at the top left. I filtered. Did my filter get undone? Or is this
> a different moment? I don't know how I got from the last screen to this one.
>
> 'on: full graph, 300 nodes, 3 components.' Back to nodes. Three components, matches the first
> screen. The Overview on the right: nodes 300, edges 1,262. No '(rows)' here and no 'linked
> pairs'. So on one screen edges were rows, on another they were interactions, here they're just
> edges. It's the same 1,262 each time, which is the important thing, but I'm reading three
> vocabularies for one file.
>
> 'Top nodes' -- MAPK1, TP53, YWHAZ, CDK1, AKT1 with little decimals. I don't know what
> betweenness is and I'm not learning it at 4 pm. '295 more in the table' -- 300 minus 5. Fine.
>
> 'zero: 10 nodes, all 291=' ... what is 'all 291='? It's cut off, or it's code. That's the kind
> of thing that makes me think something broke. And the colour key at the bottom says 'the 10
> proteins at 0 take the lightest colour'. So ten at zero, I get that. The 291 I can't place --
> 300 minus 10 is 290, not 291.
>
> 'Every step in the top 5 is over the 1% tie line; the smallest, ranks 3 and 4, is 1.2%.' No.
> I read that twice and I can't tell you what it means."

## 5. The navigation screen

> "This is Les Miserables, 77 nodes. That's not my file. Nothing here about my proteins, so I
> have nothing to explain on it. Same layout as mine, so I suppose the numbers would sit in the
> same places."

---

## Moderator: explain every count, and why it is not 300

> "It's not 300 because I filtered to one module, Ribosome, which has 56 proteins. The filter
> says it took out 244 and left 56, and 244 and 56 make 300. The legend on the full picture said
> Ribosome 56 before I filtered, so that agrees.
>
> The file has 1,262 lines between proteins -- the screen calls them edges, rows, linked pairs
> and interactions, depending where you look. After the filter, 217 of those lines are left,
> because the lines to the hidden proteins went with them.
>
> Full file: three separate groups, two of them single proteins on their own. Filtered: one group
> of 56, nobody on their own.
>
> What I can't explain: why there are two lines for the same 1,262 (edges and linked pairs); why
> it says 4 attributes when the dialog said 2 plus 1; whether 'Unassigned' with no number means
> zero; what 'Other 26' holds; what 'Hubs 0 of 10' is counting; and 'all 291=' on the results
> screen. I'd ask her about those. I wouldn't put any of them on a slide."

## Single Ease Question

**4 out of 7.**

> "The main question -- why not 300 -- was easy. A 5 or a 6 on its own. The filter box answered
> it in one line and the legend let me check it. What pulls it down is 'every count'. Half the
> numbers I could check by adding, and the other half I'd have to email her about. Things
> like a blank next to 'Unassigned' and 'all 291=' make me doubt the numbers I *could* check."

## Would he use this instead of his current tool?

**Not instead of; maybe as well as.**

> "My current tool is her PNG and her Excel file. For looking, I'd still rather have the PNG.
> But for the PI's question -- 'how many are in the ribosome module, and how many interactions
> is that' -- this gave me 56 and 217 without counting rows, and showed me they add up. That I
> can't get from a PNG. I'd open it to check her numbers. I wouldn't open it to explore, and if
> it showed me one more number I couldn't explain in lab meeting, I'd go back to asking her."

---

## Observations (for the studio, not Tom's words)

1. **The "why not 300" answer landed immediately.** "Filter to module Ribosome, took out 244, 56
   left" plus the chip "56 of 300 proteins" gave him the full sentence; he confirmed it against
   the Ribosome 56 in the full-graph legend. The legend summing to 300 was the moment he trusted
   the screen.
2. **Units are on every count only on the full-graph screen.** It says "1,262 edges (rows)" and
   "1,262 linked pairs"; the filtered Statistics says "Interactions 217 of 1,262" with neither
   unit; the results Overview says "edges 1,262" bare. He asked which kind 217 is and could not
   tell.
3. **Two equal numbers with two names read as a riddle, not as a unit.** On this file rows and
   pairs are both 1,262. Without hovering the info icon (he never hovers), he read the pair as
   "same thing twice, or two things that happen to match", and could not decide.
4. **Nouns change between screens.** nodes -> proteins -> nodes; edges (rows) / linked pairs ->
   interactions -> edges. He preferred "proteins" but wanted one word throughout.
5. **Counts that do not add up with what he was told earlier.** "Attributes 4" against the load
   dialog's 2 node plus 1 edge attributes; "Category, 9 values" against eight named modules plus
   "Other 26" whose contents are not named; "Unassigned" with a blank count.
6. **Unexplained counts cast doubt on the checked ones.** "Hubs rule 0 of 10" on the filtered
   screen, and "zero: 10 nodes, all 291=" on the results screen (reads as truncated or broken;
   290 would be 300 minus 10). He said these make him doubt the numbers he could verify.
7. **Scope jump.** The results screen shows "Full graph" right after the filtered screen; he
   asked whether his filter had been undone.
8. **Repetition.** "(56 of 300 proteins)" after every filtered statistic, six times; he got it
   the first time and called the rest noise.
9. **What worked unprompted:** the side-by-side "Degree (filtered)" and "Degree (full graph)"
   columns let him infer what degree means and that 3 of RPL28's partners are outside the module.
