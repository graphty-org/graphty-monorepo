# Do the rankings agree? -- newcomer student, on the comparison scatter

**Task, as the moderator gave it:** "Do betweenness and PageRank agree about who matters here?"

**Screens used, in order:** the comparison surface (PageRank against betweenness on the April
payment transfers; then its states around the reading), then the bottom dock table (the protein
network with three measures ranked, and the line above the table that says whether they agree).

**About the participant.** The persona file for this participant did not exist when the session
ran, so the character was built the same way as in this participant's other round-two sessions:
from the project's first-time-user persona (Explorer Elena) and the round-one finding that
newcomers cannot read the words in legends and first statistics. Treat her vocabulary and patience
as assumed.

*Assumed portrait:* Leah, 20, second-year biology undergraduate in an intro systems biology
course, working on a class project about a protein interaction list her TA exported from STRING.
She has used the STRING website and followed one Cytoscape lab handout step by step. From lecture
she knows "hub" and has heard "betweenness" and "PageRank" once each, with a slide that said
"betweenness = bridges, PageRank = important neighbors". She has taken one intro stats course:
she knows "correlation", roughly knows Spearman is "the rank one", and has never heard of Kendall.
13-inch laptop, patient for about ten minutes, blames herself first.

**Note on the mocks.** The comparison surface shows a payments network (3,093 bank accounts), not
proteins. The only screen with Leah's kind of data is the table's "Three measures ranked" state
(300 proteins). The table's "Compare rankings..." link leads to the payments comparison, so in the
prototype following the link changes the dataset. Nothing inside the product frames of the
comparison page is clickable; the info icons have no tooltip text behind them.

---

## Think-aloud

### 1. Landing on the comparison screen

"OK. There's a big hairball in the middle, purple with some yellow dots. That's the graph, I guess
colored by PageRank because the little box says 'PageRank log scale'. I don't know what log scale
means for a color but fine, yellow is high.

"On the left it says 'A PageRank' and 'B Betweenness', both highlighted. So it's already comparing
them? I didn't do anything. OK, good, that's the thing I was asked about.

"These are accounts, not proteins. ACC-139419. Whatever, it's a network."

### 2. The right column, looking for an answer

"The right side has a section called Agreement. That's literally my question. Let's see.

"'Kendall tau-b 0.656.' I don't know what Kendall tau-b is. There's a little i next to it --" (hovers,
nothing appears; clicks, nothing) "-- nothing. OK.

"'Spearman (ties inflate this) 0.781.' Spearman I know, that's rank correlation, we did it in stats.
0.78 is... pretty strong? My stats prof said above 0.7 is strong. But it says ties inflate this, so
it's too high? Then why show it. And which one am I supposed to believe? The bold one I guess, the
Kendall. 0.656. Is that strong? Medium? I genuinely don't know what scale Kendall is on. Is 0.656
on Kendall the same as 0.656 on Spearman? I'd have to Google this.

"'top 5 in both: 0 of 5.' Oh. OK, this one I get. None of the top five on one are in the top five
on the other. So they disagree about the top! But the correlation says they agree? That's
confusing. So they agree overall but not on the top?

"'tied lowest on A 1,153, 37%'. 'tied at 0 on B 1,314, 42%.' What's A again -- " (looks back up) "--
A is PageRank. So a third of accounts all have the same lowest PageRank. And almost half have zero
betweenness. That kind of makes sense, most accounts aren't bridges.

"The little paragraph: 'Ties are over 10% of a side, so tau-b leads: it counts a tied pair as
neither agreeing nor disagreeing.' 'Over 10% of a side' -- side of what? I read it twice. I think
it means: a lot of the numbers are equal, so they're using the other statistic. I'd have skipped
this if I was doing it for real."

### 3. The scatter plot

"Down here there's a scatter. 'Rank on A: PageRank, 1 to 3,093' on top, 'Rank on B: betweenness'
on the side. And 1 is at the top-left, so the axes go backwards from normal graphs. Took me a sec.
The numbers go 1, 10, 100, 1,000 so it's squished.

"There's a dotted diagonal. Legend says 'Same rank on both. Above the line, higher on B; below
it, higher on A.' Higher... does higher mean a bigger rank number or better? Because above the line
means a smaller number on B, which is better. I think 'higher' means 'more important'. Probably.

"Most of the dots are bottom-right, below the line. So most accounts are more important on
PageRank than on betweenness? Or wait -- they're all ranked like 100 to 1,000 on both, so they're
all unimportant. There's a gray bar across the bottom that says '1,314 accounts tied at 0', those are
the zero-betweenness ones, all squished into a line. And '1,153 accounts are in both tie blocks, in
the bottom-right corner, not plotted' -- so a thousand of them aren't even drawn. OK.

"The top-left shaded corner is 'top 5' and it's empty. That matches the 0 of 5. Good, that's the
same fact twice, now I believe it.

"ACC-139419 is circled way at the top: #1 on betweenness but #76 on PageRank. So the number one
bridge isn't even top 50 on PageRank."

### 4. The Differences list

"'Differences.' Tabs: 'Higher on B', 'Higher on A'. I have to remember B is betweenness again. It
would be nicer if it just said 'Higher on betweenness'. The list: ACC-139419, #76, #1, gap 75.
ACC-701495, #316, #2, gap 314. So all the top betweenness accounts are way down on PageRank.
Gap 314 is a lot.

"There's 'Create set' and 'Add note' when I'm on a row. I'd probably click Add note to write down
'top bridge not top PageRank' for my report."

### 5. The states under it

"Section 3 is little pieces. 'Higher on A' shows the top PageRank accounts all at '#1,780=' on
betweenness -- equals sign means tied, I think, like tied at zero. So the biggest PageRank accounts
have zero betweenness. Huh. The paragraph under it says 'the largest merchants: money flows into
them and never through'. OK that actually made it click: PageRank is where stuff ends up,
betweenness is what stuff goes through. For proteins... I don't know what that means for proteins.

"The 'Getting here' box: you click 'Compare with...' on PageRank and pick Betweenness. Fine. If
betweenness hasn't run yet it runs. Good, I wouldn't have known to run it first."

### 6. Over to the table (the protein one)

"This one's proteins! MAPK1, TP53. Way more comfortable. There's a line right above the table:
'MAPK1 and TP53 are the top 2 on all three measures. At #3 they part: CDK1 by degree, YWHAZ by
betweenness and pagerank.'

"That's the sentence I wanted on the other screen! It just tells me in English. And actually it
says YWHAZ is #3 by betweenness AND pagerank, so those two still agree at #3. It says 'all three'
but my question was only two of them, so I have to read the columns myself. Betweenness rank: 1, 2,
3, 4, 5. PageRank rank: 1, 2, 3, 4, 5. Same five proteins. Then at 6 they split a little -- UBB is #7
on betweenness but #6 on pagerank. So for proteins they basically agree on the top five.

"Some of the rank headers have a pink 'blocked' tag. I don't know what that means. Is the column
broken? I'll ignore it, the numbers are there.

"Then I clicked 'Compare rankings...' to see the scatter for my proteins." (Moderator: it opens the
comparison screen.) "...and it's the bank accounts again. Wait, where did my proteins go? Did I
open the wrong file? Oh, it's the prototype. OK. But if it did that for real I'd panic."

### 7. My answer

"For the payments network: they mostly agree on who DOESN'T matter -- the thousand-plus accounts
tied at the bottom on both -- but they don't agree at all on the top. Zero of the top five overlap.
The top bridge is only #76 on PageRank. The correlation number is 0.656, which I think is 'medium',
but honestly I'm reading that off the top-5 thing and the scatter, not the Kendall.

"For the proteins: yes, they agree, the same top five in the same order.

"If my TA asked me 'why is the correlation fairly high if the tops don't match', I'd... point at
the gray band at the bottom and say the zeros make it look better. That's what 'ties inflate this'
is trying to tell me, I think. I only got that after the second read."

---

## After the task

**Single Ease Question (1 very hard to 7 very easy): 5.**

"Getting to an answer was easy because '0 of 5' and the sentence above the protein table say it in
plain words. Getting to an answer I'd defend was harder: I don't know what Kendall tau-b is, the
little i did nothing, and I had to keep flipping between A and B to remember which was which."

**Would I use this instead of what I use now?** "What I use now is Cytoscape with the lab handout,
and for this I'd have to export two columns to Excel and make a scatter myself, and I'd probably
get the axes wrong. So yes, this is way better -- the table with the rank columns side by side is
exactly what I'd have built in Excel, already done. I'd use the table line and the top-5 number. I
would not put 'Kendall tau-b 0.656' in my report because I couldn't explain it if someone asked."

---

## Problems observed

1. **The comparison has no plain-language verdict** (comparison screen, Agreement section).
   The table has a sentence ("MAPK1 and TP53 are the top 2 on all three measures..."); the
   comparison, the screen built for this exact question, has only statistics. Leah read her answer
   off "top 5 in both 0 of 5" and the scatter corner, not the headline number. Severity 3.
   *Quote:* "That's the sentence I wanted on the other screen! It just tells me in English."
2. **Kendall tau-b is unexplained and its info icon shows nothing** (comparison, Agreement).
   She could not tell whether 0.656 is strong, weak or comparable to Spearman's 0.781, and would
   not quote it. Severity 3.
   *Quote:* "Is 0.656 on Kendall the same as 0.656 on Spearman? I'd have to Google this."
3. **"Higher on A / Higher on B" forces her to remember which letter is which** (comparison,
   Differences tabs and the scatter key). She looked back up to the A/B labels three times.
   Severity 2.
   *Quote:* "It would be nicer if it just said 'Higher on betweenness'."
4. **"Higher" is ambiguous on a rank axis where 1 is at the top** (scatter key). She was not sure
   whether "higher" meant a larger rank number or more important. Severity 2.
   *Quote:* "Higher... does higher mean a bigger rank number or better?"
5. **The ties note is hard to parse** ("Ties are over 10% of a side, so tau-b leads...").
   She understood it only on a second read, and only after seeing the gray tie band. Severity 2.
   *Quote:* "'Over 10% of a side' -- side of what? I read it twice."
6. **The table's agreement line answers for all measures, not the pair asked about** (table,
   Three measures ranked). With degree in the table, "top 2 on all three" understated how far
   betweenness and PageRank agree (top 5); she had to read the rank columns herself. Severity 2.
   *Quote:* "It says 'all three' but my question was only two of them."
7. **The "blocked" tags read as broken columns** (table header, notes visible). They are designer
   annotations, but she took them as product state. Severity 1 (annotation, not product).
   *Quote:* "I don't know what that means. Is the column broken?"
8. **Compare rankings... on the protein table opens the payments comparison** (prototype
   continuity). In the prototype the dataset changes under her; the real product would keep the
   proteins, but the prototype cannot test the protein scatter. Severity 2 for the study.
   *Quote:* "Wait, where did my proteins go? ... If it did that for real I'd panic."

## What worked

- "top 5 in both: 0 of 5" and the empty shaded top-5 corner say the same fact twice, and she
  trusted it because of that.
- The rank columns side by side in the table ("#1, #2, #3...") let her answer the protein question
  in seconds, with no statistic at all.
- The merchants caption under "Higher on A" ("money flows into them and never through") gave her
  the intuition for what PageRank against betweenness means.
- Betweenness runs on its own when picked in Compare with... if it has not run yet.
