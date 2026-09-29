# Do two rankings agree? -- Expert Emma, round 3

**Participant:** Expert Emma, network scientist and consultant (notebook user: networkx, igraph; Gephi for figures).
**Task as given by the moderator:** "Do these two ways of scoring agree on who matters?"
**Pages used:** the comparison screen (first frame: PageRank against betweenness on the April payments data; second frame: PageRank on March against April), then the results panel to see where a comparison starts.
**Render seen:** `shots/r3-emma-rankings-comparison-full.png` (study view, design notes hidden), `shots/screens__results-panel--finished.png`.

## Think-aloud

**1. First look.** "OK. Payments network review. Two things in the left list marked A and B: PageRank and betweenness. So somebody already put them side by side. Good, I do not have to find the menu."

"The picture in the middle is a hairball coloured by PageRank. It tells me nothing about the question, so I am going to ignore it. Top left of the rail says 'Assistant: Off. Nothing is sent.' Fine, I noticed that, I will come back to it."

**2. The right column.** "Agreement: 'The rankings disagree at the top: none of the top 10 are the same.' Hm. That is a claim, so I want the number under it. Spearman 0.781 over all 3,093 accounts. Right. So the headline and the coefficient pull in opposite directions -- 0.78 is not nothing. That is actually the honest answer: they agree globally and disagree at the top, which is exactly what you expect of PageRank against betweenness in a flow network. I would have written the same two sentences in the notebook."

"Top: 5, 10, 20, 50, 100. Ten selected. 'In both top 10: 0 of 10.' And under it '0 of 5, 0 of 20, 0 of 50, 18 of 100.' Good, that is the overlap-at-k I would compute anyway. I would rather see it as a little curve than a sentence, but I can read a sentence."

**3. Tie checking.** "Now the part I actually worry about. 'Tied lowest on A: 1,153, 37%.' 'Tied at 0 on B: 1,314, 42%.' 'In both tie blocks: 1,153.' So over a third of the accounts are leaves on both measures. That is what is propping up the 0.781. Every tool gets this wrong in a different way. How are the ties ranked -- average rank? I click the little i next to Spearman."

*(The info icon has no text behind it in the prototype; nothing opens.)*

"Nothing. So I do not know if it is average rank, or min rank, or if it dropped the ties. It matters: with 1,153 shared ties the coefficient is going to be quite different if you exclude them. What I want is a second line: Spearman without the tie block, or Spearman on the union of the top 100. Or Kendall's tau-b, which handles ties properly. As it stands I would export and recompute."

**4. The scatter.** "The scatter at the bottom. Rank on A across, rank on B down, log axes, rank 1 top left, dashed diagonal. The tie blocks drawn as bands along the edges, with counts: '1,314 accounts tied at 0' and '1,153 accounts tied at the lowest PageRank'. And a note: '1,153 accounts are in both tie blocks, in the bottom-right corner, not plotted.' Thank you. That is the first rank-rank plot in a GUI I have seen that tells me what it left out instead of piling 1,153 dots on one pixel."

"The dots above the diagonal around PageRank rank 70 to 300 but high on betweenness -- brokers. Money goes through them, it does not end there. ACC-139419 is #1 on betweenness and #76 on PageRank. Plausible. That is the story for the client, actually."

**5. Differences list.** "Higher on B, top 100 on either side: ACC-139419 #76 / #1, gap 75. ACC-701495 #316 / #2. It expands with both raw values: PageRank 4.24e-4, betweenness 1.15e-4. Betweenness 1.15e-4 for the top account. Normalized how? Divided by (n-1)(n-2) like networkx, or raw pair counts? For a comparison of ranks it does not matter, I will grant that. But the value is on the screen, so somebody will copy it into a slide."

**6. How each side was computed.** "Under A: 'Unweighted, directed. Details.' Under B: 'Exact. Unweighted, directed. Details.' Exact -- good, not sampled. Unweighted -- on a payments network. Did the file have amounts? If it did, I want to know why PageRank ignored them. That might be a deliberate choice, but it should be my choice. Damping is not shown here either. I click Details under A."

*(Details has no target in the prototype; nothing opens.)*

"Nothing again. I assume a real build shows damping and normalization there. If it does not, this is where I stop trusting the numbers. The parameters used have to be visible from the comparison, not three panels away."

**7. Getting the numbers out.** "'Export table as CSV...' in the dock, and the description of the Table view says the rows carry both values and both ranks. That is the one thing I really need: then I do the Kendall and the tie-excluded Spearman in pandas in two minutes. Fine."

**8. The second frame (March against April).** "Same layout, different question: PageRank on March against PageRank on April. 'The rankings agree at the top: all 10 of the top 10 are the same.' Spearman 0.876 over the 2,961 accounts in both months. And 'Not matched: only in March, closed 39; only in April, opened 132.' That is correct handling -- matched by id, and it tells me the denominators. And this line: 'PageRank gives the same result every run, so a re-run cannot tell change from noise.' Then a link, 'Compare with randomized baseline...'. Huh. OK, that is a null model. I did not expect that. I would need to know which randomization -- degree-preserving rewiring or what -- but the fact that it is offered at all is more than Gephi does."

**9. Where would I start this myself?** "Now on the results panel. I click PageRank; the panel has Appearance with 'PageRank color', 'Color by...', 'Label with...', and 'Compare with...'. Compare with is filed under Appearance? That is not an appearance, that is an analysis. I would have looked in the three-dot menu first. The picker it opens -- 'Compare PageRank with' and a search box, Betweenness marked 'Not run' -- that is fine. And in the comparison screen there is a state where B is still running with a progress bar and a Cancel, and it says the statistic and scatter follow when B has its values. Good, it does not block."

**10. Answering the moderator.** "My answer: no, not at the top. None of the top 10 overlap, you only get 18 shared in the top 100. Globally Spearman is 0.78, but a large share of that is the 1,153 leaf accounts that are tied at the bottom on both, so the headline number overstates agreement among the accounts anyone cares about. The high-betweenness accounts are brokers sitting around rank 70 to 300 on PageRank. That is my answer, and I got it in about two minutes. I would still recompute the coefficient without the ties before I put it in a report."

## Single Ease Question

**6 of 7.** "Reading the answer was easy. It loses a point because the two things I would check -- how ties go into Spearman, and what damping and normalization were used -- are behind a Details link and an i icon that did not tell me anything here."

## Would she use it instead of her current tool?

"For the analysis, no -- I would do this in the notebook, and I would still recompute the correlation there. But this is the plot I would have made in matplotlib, with the tie bands handled better than I would have bothered to, and I could hand this screen to a fraud investigator and they would understand the first sentence without me. For that, yes. Give me the same thing as a widget I can call from the notebook and I would stop making this plot by hand."

## Problems observed

1. **Parameters not visible from the comparison (severity 3).** "Details" under each side leads nowhere in the prototype, and the state line shows no damping for PageRank and no normalization for betweenness, although raw betweenness values are shown in the difference list. Quote: "The parameters used have to be visible from the comparison, not three panels away."
2. **Tie handling in Spearman unstated; no tie-excluded or top-k coefficient (severity 2).** 1,153 of 3,093 accounts are in both tie blocks and lift the coefficient; the info icon next to Spearman explains nothing. Quote: "How are the ties ranked -- average rank? ... Or Kendall's tau-b, which handles ties properly."
3. **"Unweighted" on a payments network with no visible reason (severity 2).** She cannot tell whether the data had amounts and they were ignored. Quote: "Unweighted -- on a payments network. Did the file have amounts?"
4. **"Compare with..." filed under Appearance in the results panel (severity 1).** She looked for it in the overflow menu first. Quote: "That is not an appearance, that is an analysis."
5. **Overlap at other values of Top given as a sentence, not a curve (severity 1).** Quote: "I would rather see it as a little curve than a sentence, but I can read a sentence."
6. **Randomized baseline offered without saying which randomization (severity 1).** Quote: "I would need to know which randomization -- degree-preserving rewiring or what."
7. **No scripted route (severity 2, standing concern).** Quote: "Give me the same thing as a widget I can call from the notebook."

## What worked

- The answer first, in one sentence, with Spearman and its denominator directly under it.
- Top 5 / 10 / 20 / 50 / 100 with the overlap at every choice listed.
- Tie blocks drawn as labelled bands with counts, and an explicit note of what was not plotted.
- Matching by id across March and April, with the unmatched accounts counted separately.
- Export of every account with both values and both ranks.
- "Assistant: Off. Nothing is sent." visible on the rail without looking for it.
