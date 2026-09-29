# Do the rankings agree? -- newcomer student, on the comparison scatter (round 3)

**Task, as the moderator gave it:** "Do betweenness and PageRank agree about who matters here?"

**Screens used, in order:** the comparison surface (PageRank against betweenness on the April
payment transfers, then the states around it), then the bottom dock table ("Three measures
ranked": the protein network with degree, betweenness and PageRank ranked side by side). All renders
were the participant view, with design notes hidden:
`shots/r3-newcomer-rankings-comparison-full.png`, `shots/r3-newcomer-rankings-table-dock-full.png`
and `shots/r3-newcomer-rankings-table-ranked.png`.

**About the participant.** There is still no persona file for this participant, so the same
character as rounds two and three's other sessions was used: built from the project's first-time
user persona and the round-one finding that newcomers cannot read the words in legends and first
statistics. Her vocabulary and patience are assumed.

*Assumed portrait:* Leah, 20, second-year biology undergraduate in an intro systems biology course,
class project on a protein interaction list her TA exported from STRING. Has followed one Cytoscape
lab handout. From lecture: "betweenness = bridges, PageRank = important neighbors". One intro stats
course: knows correlation, roughly knows Spearman is "the rank one". 13-inch laptop, patient for
about ten minutes, blames herself first.

**Note on the mocks.** As in round two, the comparison shows bank accounts, not proteins, and the
table's "Compare rankings..." link opens that same payments comparison. Nothing inside the product
frames reacts to a click or hover: the Top choices, the tabs and the info icon are pictures. The
design notes (including the caption that explained why merchants rank high on PageRank and zero on
betweenness) are hidden in this view, so she did not see them this time.

---

## Think-aloud

### 1. Landing on the comparison

"Same payments hairball as last time, purple with yellow. On the left, A PageRank and B
Betweenness, both highlighted. On the right, 'Comparison, PageRank and betweenness.' OK, it's
already comparing the two I was asked about.

"Agreement. Oh -- there's a sentence now, in bold: 'The rankings disagree at the top: none of the
top 10 are the same.' That's literally my answer. That's what I asked for last time. Great.

"Under it, 'Spearman 0.781 over all 3,093 accounts' and a little i." (Hovers, then clicks.)
"Nothing, again. And the Kendall thing is gone. Good, I didn't understand it anyway."

### 2. Wait, 0.781?

"Hang on. 0.781 is a strong correlation. My stats prof said above 0.7 is strong. And the sentence
right above says they disagree. Last time there was a little 'ties inflate this' warning next to
Spearman, which is how I figured out the zeros were pumping it up. Now it's just 0.781, no warning.
So... they disagree, with a strong correlation? I'm going to assume I'm missing something.

"Let me read the rows. 'Top: 5, 10, 20, 50, 100', 10 is picked. 'in both top 10: 0 of 10.' 'In
both at the other choices of Top: 0 of 5, 0 of 20, 0 of 50, 18 of 100.' 'The other choices of Top'
-- weird phrase, took me a second, but OK: even at the top 50 there's nobody in both lists, and only
at 100 do 18 show up. That's actually really clear once you read it. I'd click 100 to see, but I can
already see the number.

"'tied lowest on A 1,153, 37%.' 'tied at 0 on B 1,314, 42%.' 'in both tie blocks 1,153.' So every
single account at the bottom of PageRank is also zero on betweenness. OK, so maybe THAT's why
Spearman is high -- they agree about the losers. That's my guess from last time. The screen doesn't
connect those rows to the 0.781 though. If I hadn't done the last session I don't think I'd get it."

### 3. The scatter

"Scatter at the bottom. 'Full graph: 3,093 accounts. Rank on A, PageRank, against rank on B,
betweenness.' A and B again. 1 at the top left, log scale, I remember that from last time.

"The top-left corner is shaded, 'top 10', and it's empty. Matches the '0 of 10'. Good, same fact
twice, I trust it.

"Key: 'Same rank on both. Above the line, higher on B; below it, higher on A.' Still not sure if
'higher' means better or a bigger number. I'm going with better. 'A block of tied values over 10%
of a side, drawn as one band.' 'Of a side' -- still don't love that. There's a gray band along the
bottom, '1,314 accounts tied at 0', and one on the right, '1,153 accounts tied at the lowest
PageRank'. And '1,153 accounts are in both tie blocks, in the bottom-right corner, not plotted'.
So a third of the network isn't even a dot. OK.

"ACC-139419 circled at the very top: '#76 on A, #1 on B'. The top bridge is #76 on PageRank."

### 4. Differences

"'Higher on B' and 'Higher on A' tabs. Still letters. I glanced back up at the A/B boxes twice to
remember B is betweenness. 'Top 100 on either side, by rank on B.' ACC-139419 #76 #1 gap 75,
ACC-701495 #316 #2 gap 314. The second-best bridge is #316 on PageRank! Create set, Add note. I'd
add a note.

"The 'Higher on A' version, lower down: every top PageRank account is '#1,780=' on betweenness.
So the top PageRank accounts all have zero betweenness. Last time there was a caption that said
something like money flows into them and never through, and that's what made it click for me.
It's not there now. I just see '#1,780=' eight times. I remember the idea, but a new person wouldn't
get WHY they disagree, only that they do."

### 5. The states around it

"There's a 'Running' one, with a bar and Cancel -- 'The statistic, the scatter and the difference
list follow when B has its values.' Fine. There's the 'Compare PageRank with' menu where Betweenness
says 'Not run', so it'll run it for me. Good. The March-vs-April one says 'The rankings agree at the
top: all 10 of the top 10 are the same.' Nice, the sentence flips when it's true. That makes me
trust the first one more."

### 6. The protein table

"This is my kind of data. 'MAPK1 and TP53 are the top 2 on all three measures. At #3 they part:
CDK1 by degree, YWHAZ by betweenness and pagerank.' Again it's all three, but I only care about two.
So I read the columns: betweenness rank 1, 2, 3, 4, 5 -- MAPK1, TP53, YWHAZ, CDK1, AKT1. PageRank
rank 1, 2, 3, 4, 5, same five. Then betweenness goes 7, 9, 8, 10 and PageRank 6, 7, 8, 9. So for
proteins betweenness and PageRank agree on the whole top 5 in the same order, and only shuffle a
little after. The sentence would have said that if it only talked about those two -- 'the top 5 are
the same' -- but degree breaks it at #3.

"'#4=' -- I get it now, AKT1 and YWHAZ both have degree 24, tied. 'PageRank damping 0.85' in the
header -- no idea what damping is. 'Louvain weighted, seed 7' -- seed? Ignoring.

"Compare rankings..." (clicks; moderator: it opens the comparison page) "...and it's bank accounts
again. Same as last time. For real I'd want the scatter for MY proteins, with the '0 of 10' or
whatever the protein number is."

### 7. My answer

"For the payments: no, they don't agree about who matters. None of the top 10 are the same, none of
the top 50, only 18 of the top 100. The number one bridge is #76 on PageRank. The only thing they
agree on is the bottom: 1,153 accounts are dead last on both. I think that's why Spearman says
0.781, but the screen didn't tell me that, I'm guessing.

"For the proteins: yes, they agree -- same top 5, same order.

"In my report I'd write the sentence and the 18 of 100. I would not write 0.781, because if my TA
asked 'then why is it 0.78?' I'd have to say 'I think the zeros?'"

---

## After the task

**Single Ease Question (1 very hard to 7 very easy): 6.**

"Getting the answer was really easy this time -- it's the first bold thing in the Agreement box, in
English. I took a point off because the Spearman number right under it says the opposite and nobody
tells me why, and the little i still does nothing."

**Would I use this instead of what I use now?** "Yes. In Cytoscape I'd export two columns to Excel
and make the scatter myself and get the axes backwards. Here the sentence answers it, the top-10
corner shows it, and the protein table gives me the ranks side by side. I'd use it for the class
project. I'd just want the i to tell me what Spearman means here, 'betweenness' instead of 'B', and
the scatter for my own proteins."

---

## Problems observed

1. **Spearman 0.781 sits right under "disagree at the top" with nothing reconciling them**
   (comparison, Agreement). The round-two "ties inflate this" hint is gone, and the tie rows below
   are not tied to the number. A newcomer reads "strong correlation" against "disagree" and blames
   herself. Severity 3.
   *Quote:* "They disagree, with a strong correlation? I'm going to assume I'm missing something."
2. **The info icon next to Spearman still shows nothing** on hover or click (comparison,
   Agreement). It has been dead in every round. Severity 3.
   *Quote:* "Nothing, again."
3. **Nothing on the screen says why the two measures disagree.** With the design caption hidden,
   the "Higher on A" list is eight rows of "#1,780=" with no words; the merchants explanation that
   gave her the intuition last round was a designer note, not product text. Severity 2.
   *Quote:* "A new person wouldn't get WHY they disagree, only that they do."
4. **A and B letters persist** in the Differences tabs, the scatter key, the selected-account line
   and the scope line. She looked back at the A/B boxes twice. Severity 2.
   *Quote:* "Still letters."
5. **"Higher" is still ambiguous on a rank axis where 1 is at the top** (scatter key). Severity 2.
   *Quote:* "Still not sure if 'higher' means better or a bigger number."
6. **The table's agreement line speaks for all three measures**, so degree breaking at #3 hides that
   betweenness and PageRank agree on the whole top 5 (table, Three measures ranked). Severity 2.
   *Quote:* "Again it's all three, but I only care about two."
7. **Compare rankings... on the protein table opens the payments comparison** (prototype
   continuity; still no protein scatter to test). Severity 2 for the study.
   *Quote:* "It's bank accounts again. Same as last time."
8. **"In both at the other choices of Top"** reads awkwardly; she understood it on a second pass.
   Severity 1.
   *Quote:* "'The other choices of Top' -- weird phrase."
9. **"A block of tied values over 10% of a side"** in the scatter key is still unclear ("side").
   Severity 1.
10. **Header jargon in the table**: "damping 0.85", "seed 7". She ignored both. Severity 1.

## What worked

- The plain sentence first in Agreement: "The rankings disagree at the top: none of the top 10 are
  the same." She had her answer in seconds; it is what she asked for last round.
- The overlap at every Top ("0 of 5, 0 of 20, 0 of 50, 18 of 100") showed where agreement starts
  without clicking.
- The empty shaded top-10 corner repeats the "0 of 10", so she trusted it.
- The March-versus-April state's sentence flips to "agree at the top: all 10 of the top 10", which
  made the first sentence feel honest rather than canned.
- Dropping Kendall removed the number she could not explain last time.
- The protein table's rank columns side by side let her answer the protein question with no
  statistic; "#4=" now reads as a tie.
